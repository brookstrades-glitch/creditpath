'use strict'

/**
 * Credit routes
 *
 *   POST /api/credit/pull     — Pull tri-bureau report (soft or hard)
 *   GET  /api/credit/snapshots — Return pull history (scores + counts, no PII)
 *
 * DESIGN: Full credit report (full_feed) is NEVER stored.
 * Only aggregate scores + counts are saved in PullSnapshot for delta view.
 * Per PRD §1.3 stateless design + FCRA §628 data disposal.
 */

const express = require('express')
const { z }   = require('zod')
const { PrismaClient }   = require('@prisma/client')
const { pullCreditReport } = require('../services/isoftpull')
const { recordPull }       = require('../middleware/rateLimit')
const { generateActionPlan } = require('../services/actionPlan')
const { attachExpiryData }   = require('../services/fcraExpiry')
const logger = require('../lib/logger')

const router = express.Router()
const prisma = new PrismaClient()

// ─── Validation schemas ───────────────────────────────────────────────────────
const SoftPullSchema = z.object({
  first_name: z.string().min(1),
  last_name:  z.string().min(1),
  address:    z.string().min(5),
  city:       z.string().min(1),
  State:      z.string().min(2),   // Full state name per iSoftpull API
  zip:        z.string().regex(/^\d{5}$/),
  pullType:   z.literal('soft'),
})

const HardPullSchema = SoftPullSchema.extend({
  pullType:      z.literal('hard'),
  ssn:           z.string().regex(/^\d{9}$/, 'SSN must be 9 digits, no dashes'),
  date_of_birth: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'DOB must be mm/dd/yyyy'),
})

const PullSchema = z.discriminatedUnion('pullType', [SoftPullSchema, HardPullSchema])

// ─── POST /api/credit/pull ────────────────────────────────────────────────────
router.post('/pull', async (req, res, next) => {
  try {
    // Consent check — must have consented before any pull
    if (!req.user.fcraConsentAt) {
      return res.status(403).json({
        error: {
          message: 'FCRA consent required before pulling credit data',
          code: 'CONSENT_REQUIRED',
        }
      })
    }

    const parsed = PullSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          message: 'Invalid pull request',
          code: 'VALIDATION_ERROR',
          details: parsed.error.flatten(),
        }
      })
    }

    const fields     = parsed.data
    const isHardPull = fields.pullType === 'hard'

    // Record the pull attempt now that validation has passed
    recordPull(req.user.id)
    logger.info({ message: 'Credit pull initiated', userId: req.user.id, pullType: fields.pullType })

    // Pull from iSoftpull (or mock if USE_MOCK=true)
    const rawReport = await pullCreditReport(fields, isHardPull)

    // Generate action plan and attach FCRA expiry data
    const actionPlan    = generateActionPlan(rawReport)
    const itemsWithExpiry = attachExpiryData(rawReport)

    // Save lightweight snapshot for delta view (no PII, no full_feed)
    const bureauStatuses = {
      equifax:    rawReport.equifax?.status    || 'unknown',
      experian:   rawReport.experian?.status   || 'unknown',
      transunion: rawReport.transunion?.status || 'unknown',
    }

    await prisma.pullSnapshot.create({
      data: {
        userId: req.user.id,
        equifaxFico4:       rawReport.scores?.equifax?.fico4       ?? null,
        equifaxVantage4:    rawReport.scores?.equifax?.vantage4    ?? null,
        transunionFico4:    rawReport.scores?.transunion?.fico4    ?? null,
        transunionVantage4: rawReport.scores?.transunion?.vantage4 ?? null,
        experianFico8:      rawReport.scores?.experian?.fico8      ?? null,
        experianVantage4:   rawReport.scores?.experian?.vantage4   ?? null,
        negativeMarkCount:  (rawReport.negative_accounts || []).length,
        inquiryCount:       (rawReport.inquiries || []).length,
        collectionCount:    (rawReport.collections || []).length,
        publicRecordCount:  (rawReport.public_records || []).length,
        bureauStatuses,
      }
    })

    logger.info({ message: 'Credit pull completed', userId: req.user.id })

    const fullReport = { ...rawReport, actionPlan, itemsWithExpiry }

    // Persist the full report so it reloads on next login
    await prisma.storedReport.upsert({
      where:  { userId: req.user.id },
      update: { report: fullReport, pulledAt: new Date(), updatedAt: new Date() },
      create: { userId: req.user.id, report: fullReport },
    })

    return res.json({
      report:   fullReport,
      pulledAt: new Date().toISOString(),
      pullType: fields.pullType,
    })
  } catch (err) {
    // iSoftpull-specific errors
    if (err.code === 'ISOFTPULL_TIMEOUT') {
      return res.status(504).json({
        error: { message: err.message, code: 'ISOFTPULL_TIMEOUT' }
      })
    }
    next(err)
  }
})

// ─── GET /api/credit/last-report ─────────────────────────────────────────────
router.get('/last-report', async (req, res, next) => {
  try {
    const stored = await prisma.storedReport.findUnique({
      where: { userId: req.user.id },
    })

    if (!stored) return res.json({ report: null })

    return res.json({
      report:   stored.report,
      pulledAt: stored.pulledAt.toISOString(),
    })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/credit/snapshots ────────────────────────────────────────────────
router.get('/snapshots', async (req, res, next) => {
  try {
    const snapshots = await prisma.pullSnapshot.findMany({
      where:   { userId: req.user.id },
      orderBy: { pulledAt: 'asc' },
      select: {
        id:                 true,
        pulledAt:           true,
        equifaxFico4:       true,
        equifaxVantage4:    true,
        transunionFico4:    true,
        transunionVantage4: true,
        experianFico8:      true,
        experianVantage4:   true,
        negativeMarkCount:  true,
        inquiryCount:       true,
        collectionCount:    true,
        publicRecordCount:  true,
        bureauStatuses:     true,
      }
    })

    return res.json({ snapshots })
  } catch (err) {
    next(err)
  }
})

module.exports = router
