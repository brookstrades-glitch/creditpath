'use strict'

/**
 * Auth routes — user sync and FCRA consent
 *
 * These routes verify the Clerk JWT directly (not via requireAuth middleware)
 * because the user may not yet exist in our DB on first sign-in.
 *
 * Route list:
 *   POST /api/auth/sync    — Create/return our DB user after Clerk sign-in
 *   POST /api/auth/consent — Store FCRA §604(a)(2) consent text + timestamp
 *   GET  /api/auth/me      — Return current user profile (protected)
 */

const express  = require('express')
const { z }    = require('zod')
const { createClerkClient } = require('@clerk/backend')
const { PrismaClient }      = require('@prisma/client')
const logger   = require('../lib/logger')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
})

// ─── Helper: verify Clerk token and return clerkId ───────────────────────────
async function verifyToken(req, res) {
  const sessionToken = req.headers.authorization?.replace('Bearer ', '')
  if (!sessionToken) {
    res.status(401).json({ error: { message: 'Authentication required', code: 'UNAUTHORIZED' } })
    return null
  }
  try {
    const { sub: clerkId } = await clerk.verifyToken(sessionToken)
    return clerkId
  } catch {
    res.status(401).json({ error: { message: 'Invalid session token', code: 'INVALID_SESSION' } })
    return null
  }
}

// ─── POST /api/auth/sync ─────────────────────────────────────────────────────
// Called by the frontend right after Clerk sign-in/sign-up.
// Upserts the user in our DB so requireAuth works on subsequent requests.
router.post('/sync', async (req, res, next) => {
  try {
    const clerkId = await verifyToken(req, res)
    if (!clerkId) return

    // Fetch user details from Clerk
    const clerkUser = await clerk.users.getUser(clerkId)
    const email     = clerkUser.emailAddresses?.[0]?.emailAddress

    if (!email) {
      return res.status(400).json({
        error: { message: 'No email address on Clerk account', code: 'NO_EMAIL' }
      })
    }

    // Upsert — safe on both first sign-in and repeat calls
    const user = await prisma.user.upsert({
      where:  { clerkId },
      update: { email }, // Keep email in sync if user changes it in Clerk
      create: { clerkId, email },
      select: {
        id: true,
        email: true,
        state: true,
        fcraConsentAt: true,
      }
    })

    logger.info({ message: 'User synced', userId: user.id })

    return res.json({
      user: {
        id:            user.id,
        email:         user.email,
        state:         user.state,
        hasConsented:  !!user.fcraConsentAt,
      }
    })
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/auth/consent ───────────────────────────────────────────────────
// Stores FCRA §604(a)(2) consent.
// The full consent text and UTC timestamp are stored in the DB.
// This must be called before any credit pull.
const ConsentSchema = z.object({
  consentText: z.string().min(50, 'Consent text too short — full text required'),
  state:       z.string().length(2).toUpperCase().optional(),
})

router.post('/consent', requireAuth, async (req, res, next) => {
  try {
    const parsed = ConsentSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: { message: 'Invalid consent data', code: 'VALIDATION_ERROR', details: parsed.error.flatten() }
      })
    }

    const { consentText, state } = parsed.data

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        fcraConsentAt: new Date(),
        consentText,
        ...(state ? { state } : {}),
      },
      select: { id: true, fcraConsentAt: true, state: true }
    })

    logger.info({ message: 'FCRA consent stored', userId: req.user.id })

    return res.json({
      message: 'Consent recorded',
      consentAt: updated.fcraConsentAt,
    })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  return res.json({
    user: {
      id:           req.user.id,
      email:        req.user.email,
      state:        req.user.state,
      hasConsented: !!req.user.fcraConsentAt,
      consentAt:    req.user.fcraConsentAt,
    }
  })
})

module.exports = router
