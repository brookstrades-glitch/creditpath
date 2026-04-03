'use strict'

/**
 * Letters routes
 *
 *   POST /api/letters/generate  — Generate a PDF letter and return it
 *   GET  /api/letters           — List user's generated letter records
 *
 * PDFs are generated on-demand and streamed directly to the client.
 * They are NEVER written to disk (Railway filesystem resets on every deploy).
 * A Letter record is created in the DB for tracking purposes only — no path stored.
 *
 * All 14 letter templates per PRD §5.5:
 *   1-5:  Bureau dispute letters (§611)
 *   6-10: Furnisher dispute letters (§623)
 *   11:   Goodwill adjustment
 *   12:   Pay-for-delete negotiation
 *   13:   Settlement offer
 *   14:   FDCPA debt validation (§1692g)
 */

const express  = require('express')
const { z }    = require('zod')
const { PrismaClient } = require('@prisma/client')
const { generateLetter } = require('../letters/generator')
const logger   = require('../lib/logger')

const router = express.Router()
const prisma = new PrismaClient()

const LETTER_PATHS = ['bureau', 'furnisher', 'creditor', 'collector']
const LETTER_NUMBERS = [1,2,3,4,5,6,7,8,9,10,11,12,13,14]

// ─── POST /api/letters/generate ───────────────────────────────────────────────
const GenerateSchema = z.object({
  letterNumber: z.number().int().min(1).max(14),
  path:         z.enum(LETTER_PATHS),
  // Merge fields — vary by letter type
  bureau:       z.string().optional(),
  creditor:     z.string().optional(),
  accountNumber: z.string().optional(),
  itemDescription: z.string().optional(),
  amount:       z.number().optional(),
  bureauAddress: z.string().optional(),
  creditorAddress: z.string().optional(),
})

router.post('/generate', async (req, res, next) => {
  try {
    const parsed = GenerateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: { message: 'Validation error', code: 'VALIDATION_ERROR', details: parsed.error.flatten() }
      })
    }

    const fields = parsed.data

    // Generate PDF buffer in memory (never touches disk)
    const pdfBuffer = await generateLetter({
      letterNumber:    fields.letterNumber,
      path:            fields.path,
      user:            req.user,
      bureau:          fields.bureau,
      creditor:        fields.creditor,
      accountNumber:   fields.accountNumber,
      itemDescription: fields.itemDescription,
      amount:          fields.amount,
      bureauAddress:   fields.bureauAddress,
      creditorAddress: fields.creditorAddress,
    })

    // Record that this letter was generated (for tracking — no PDF path)
    await prisma.letter.create({
      data: {
        userId:       req.user.id,
        letterType:   `Letter ${fields.letterNumber}`,
        letterNumber: fields.letterNumber,
        path:         fields.path,
        bureau:       fields.bureau   || null,
        creditor:     fields.creditor || null,
      }
    })

    logger.info({
      message: 'Letter generated',
      userId: req.user.id,
      letterNumber: fields.letterNumber,
    })

    // Stream PDF directly to client
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="creditpath-letter-${fields.letterNumber}.pdf"`)
    res.setHeader('Content-Length', pdfBuffer.length)
    return res.send(pdfBuffer)
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/letters ─────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const letters = await prisma.letter.findMany({
      where:   { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    })
    return res.json({ letters })
  } catch (err) {
    next(err)
  }
})

module.exports = router
