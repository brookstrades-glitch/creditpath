'use strict'

/**
 * Account routes
 *
 *   GET    /api/account         — Get user profile
 *   PATCH  /api/account         — Update state (for state law compliance notices)
 *   DELETE /api/account         — Delete account and all data (FCRA right to erasure)
 */

const express = require('express')
const { z }   = require('zod')
const { PrismaClient } = require('@prisma/client')
const logger  = require('../lib/logger')

const router = express.Router()
const prisma = new PrismaClient()

// ─── GET /api/account ─────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.user.id },
      select: {
        id:           true,
        email:        true,
        state:        true,
        fcraConsentAt: true,
        createdAt:    true,
        _count: {
          select: {
            disputes:     true,
            letters:      true,
            negotiations: true,
            pullSnapshots: true,
          }
        }
      }
    })

    return res.json({
      user: {
        ...user,
        hasConsented: !!user.fcraConsentAt,
      }
    })
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /api/account ───────────────────────────────────────────────────────
const UpdateSchema = z.object({
  state: z.string().length(2).toUpperCase(),
})

router.patch('/', async (req, res, next) => {
  try {
    const parsed = UpdateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: { message: 'Validation error', code: 'VALIDATION_ERROR', details: parsed.error.flatten() }
      })
    }

    const updated = await prisma.user.update({
      where:  { id: req.user.id },
      data:   { state: parsed.data.state },
      select: { id: true, email: true, state: true }
    })

    return res.json({ user: updated })
  } catch (err) {
    next(err)
  }
})

// ─── DELETE /api/account ──────────────────────────────────────────────────────
// Cascades to all disputes, letters, negotiations, snapshots via Prisma schema
router.delete('/', async (req, res, next) => {
  try {
    await prisma.user.delete({ where: { id: req.user.id } })

    logger.info({ message: 'Account deleted', userId: req.user.id })

    return res.json({ message: 'Account and all associated data deleted' })
  } catch (err) {
    next(err)
  }
})

module.exports = router
