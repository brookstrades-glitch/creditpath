'use strict'

/**
 * Negotiation routes
 *
 *   POST   /api/negotiate             — Start a negotiation track
 *   GET    /api/negotiate             — List all negotiations
 *   GET    /api/negotiate/:id         — Get single negotiation
 *   PATCH  /api/negotiate/:id         — Update phase, strategy, terms
 *   PATCH  /api/negotiate/:id/letter  — Log a letter sent in this negotiation
 *   DELETE /api/negotiate/:id         — Delete a negotiation
 *
 * Strategies per PRD §5.6:
 *   pay_for_delete — Pay in exchange for tradeline deletion
 *   goodwill       — Request removal as a goodwill gesture (Letter 11)
 *   settlement     — Settle for less than owed (Letter 13)
 */

const express = require('express')
const { z }   = require('zod')
const { PrismaClient } = require('@prisma/client')
const logger  = require('../lib/logger')

const router = express.Router()
const prisma = new PrismaClient()

const VALID_PHASES     = ['validation', 'negotiation', 'verification']
const VALID_STRATEGIES = ['pay_for_delete', 'goodwill', 'settlement']

// ─── Create negotiation ───────────────────────────────────────────────────────
const CreateSchema = z.object({
  creditorName:       z.string().min(1),
  accountDescription: z.string().min(1),
  strategy:           z.enum(VALID_STRATEGIES),
})

router.post('/', async (req, res, next) => {
  try {
    const parsed = CreateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: { message: 'Validation error', code: 'VALIDATION_ERROR', details: parsed.error.flatten() }
      })
    }

    const negotiation = await prisma.negotiation.create({
      data: {
        userId: req.user.id,
        ...parsed.data,
        phase: 'validation', // Always starts at validation
      }
    })

    return res.status(201).json({ negotiation })
  } catch (err) {
    next(err)
  }
})

// ─── List negotiations ────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const negotiations = await prisma.negotiation.findMany({
      where:   { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    })
    return res.json({ negotiations })
  } catch (err) {
    next(err)
  }
})

// ─── Get single ───────────────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const negotiation = await prisma.negotiation.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    })

    if (!negotiation) {
      return res.status(404).json({ error: { message: 'Negotiation not found', code: 'NOT_FOUND' } })
    }

    return res.json({ negotiation })
  } catch (err) {
    next(err)
  }
})

// ─── Update negotiation ───────────────────────────────────────────────────────
const UpdateSchema = z.object({
  phase:           z.enum(VALID_PHASES).optional(),
  strategy:        z.enum(VALID_STRATEGIES).optional(),
  agreedTerms:     z.string().optional(),
  paymentStatus:   z.string().optional(),
  deletionVerified: z.boolean().optional(),
  notes:           z.string().max(2000).optional(),
})

router.patch('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.negotiation.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    })
    if (!existing) {
      return res.status(404).json({ error: { message: 'Negotiation not found', code: 'NOT_FOUND' } })
    }

    const parsed = UpdateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: { message: 'Validation error', code: 'VALIDATION_ERROR', details: parsed.error.flatten() }
      })
    }

    const updated = await prisma.negotiation.update({
      where: { id: req.params.id },
      data:  parsed.data,
    })

    return res.json({ negotiation: updated })
  } catch (err) {
    next(err)
  }
})

// ─── Log a letter sent in this negotiation ────────────────────────────────────
const LetterLogSchema = z.object({
  letterType: z.string().min(1),
  sentAt:     z.string().datetime(),
})

router.patch('/:id/letter', async (req, res, next) => {
  try {
    const existing = await prisma.negotiation.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    })
    if (!existing) {
      return res.status(404).json({ error: { message: 'Negotiation not found', code: 'NOT_FOUND' } })
    }

    const parsed = LetterLogSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: { message: 'Validation error', code: 'VALIDATION_ERROR', details: parsed.error.flatten() }
      })
    }

    const currentLetters = Array.isArray(existing.lettersSent) ? existing.lettersSent : []
    const updatedLetters = [...currentLetters, { ...parsed.data, respondedAt: null }]

    const updated = await prisma.negotiation.update({
      where: { id: req.params.id },
      data:  { lettersSent: updatedLetters },
    })

    return res.json({ negotiation: updated })
  } catch (err) {
    next(err)
  }
})

// ─── Delete negotiation ───────────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.negotiation.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    })
    if (!existing) {
      return res.status(404).json({ error: { message: 'Negotiation not found', code: 'NOT_FOUND' } })
    }

    await prisma.negotiation.delete({ where: { id: req.params.id } })
    return res.json({ message: 'Negotiation deleted' })
  } catch (err) {
    next(err)
  }
})

module.exports = router
