'use strict'

/**
 * Disputes routes
 *
 *   POST   /api/disputes          — Create a new dispute
 *   GET    /api/disputes          — List all disputes for the user
 *   GET    /api/disputes/:id      — Get a single dispute
 *   PATCH  /api/disputes/:id      — Update status, notes, escalation
 *   DELETE /api/disputes/:id      — Delete a dispute
 *
 * FCRA §611(a)(1)(A): 30-day reinvestigation clock starts when bureau
 * RECEIVES the dispute — submittedAt must be the receipt date, not the
 * letter generation date. The frontend makes this explicit on the UI.
 *
 * FCRA §611(a)(2)(B): bureau may extend by 15 days if consumer provides
 * additional information after the initial dispute — surfaced in status.
 */

const express = require('express')
const { z }   = require('zod')
const { PrismaClient } = require('@prisma/client')
const logger  = require('../lib/logger')

const router = express.Router()
const prisma = new PrismaClient()

const VALID_BUREAUS       = ['equifax', 'experian', 'transunion', 'furnisher']
const VALID_PATHS         = ['bureau', 'furnisher']
const VALID_STATUSES      = [
  'pending', 'submitted', 'in_reinvestigation',
  'resolved_favorable', 'resolved_unfavorable',
  'escalated', 'statement_added',
]

// ─── Create dispute ───────────────────────────────────────────────────────────
const CreateSchema = z.object({
  bureau:          z.enum(VALID_BUREAUS),
  disputePath:     z.enum(VALID_PATHS),
  itemDescription: z.string().min(10, 'Please describe the item being disputed'),
  submittedAt:     z.string().datetime().optional().nullable(), // ISO 8601
})

router.post('/', async (req, res, next) => {
  try {
    const parsed = CreateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: { message: 'Validation error', code: 'VALIDATION_ERROR', details: parsed.error.flatten() }
      })
    }

    const { bureau, disputePath, itemDescription, submittedAt } = parsed.data

    const dispute = await prisma.dispute.create({
      data: {
        userId:          req.user.id,
        bureau,
        disputePath,
        itemDescription,
        status:          'pending',
        submittedAt:     submittedAt ? new Date(submittedAt) : null,
      }
    })

    logger.info({ message: 'Dispute created', userId: req.user.id, disputeId: dispute.id })

    return res.status(201).json({ dispute })
  } catch (err) {
    next(err)
  }
})

// ─── List disputes ────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const disputes = await prisma.dispute.findMany({
      where:   { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    })
    return res.json({ disputes })
  } catch (err) {
    next(err)
  }
})

// ─── Get single dispute ───────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const dispute = await prisma.dispute.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    })

    if (!dispute) {
      return res.status(404).json({ error: { message: 'Dispute not found', code: 'NOT_FOUND' } })
    }

    return res.json({ dispute })
  } catch (err) {
    next(err)
  }
})

// ─── Update dispute ───────────────────────────────────────────────────────────
const UpdateSchema = z.object({
  status:      z.enum(VALID_STATUSES).optional(),
  submittedAt: z.string().datetime().optional().nullable(),
  resolvedAt:  z.string().datetime().optional().nullable(),
  notes:       z.string().max(2000).optional(),
}).refine(data => Object.keys(data).length > 0, { message: 'No fields to update' })

router.patch('/:id', async (req, res, next) => {
  try {
    // Verify ownership
    const existing = await prisma.dispute.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    })

    if (!existing) {
      return res.status(404).json({ error: { message: 'Dispute not found', code: 'NOT_FOUND' } })
    }

    const parsed = UpdateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: { message: 'Validation error', code: 'VALIDATION_ERROR', details: parsed.error.flatten() }
      })
    }

    const data = parsed.data
    const updateData = {}

    if (data.status)      updateData.status     = data.status
    if (data.notes)       updateData.notes      = data.notes
    if ('submittedAt' in data) updateData.submittedAt = data.submittedAt ? new Date(data.submittedAt) : null
    if ('resolvedAt'  in data) updateData.resolvedAt  = data.resolvedAt  ? new Date(data.resolvedAt)  : null

    // Auto-set escalatedAt when status moves to 'escalated'
    if (data.status === 'escalated' && !existing.escalatedAt) {
      updateData.escalatedAt = new Date()
    }

    const updated = await prisma.dispute.update({
      where: { id: req.params.id },
      data:  updateData,
    })

    return res.json({ dispute: updated })
  } catch (err) {
    next(err)
  }
})

// ─── Delete dispute ───────────────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.dispute.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    })

    if (!existing) {
      return res.status(404).json({ error: { message: 'Dispute not found', code: 'NOT_FOUND' } })
    }

    await prisma.dispute.delete({ where: { id: req.params.id } })

    logger.info({ message: 'Dispute deleted', userId: req.user.id, disputeId: req.params.id })

    return res.json({ message: 'Dispute deleted' })
  } catch (err) {
    next(err)
  }
})

module.exports = router
