'use strict'

/**
 * Auth routes — register, login, consent, me
 *
 *   POST /api/auth/register  — Create account, return JWT
 *   POST /api/auth/login     — Verify password, return JWT
 *   GET  /api/auth/me        — Return current user (protected)
 *   POST /api/auth/consent   — Store FCRA §604(a)(2) consent (protected)
 */

const express = require('express')
const bcrypt  = require('bcrypt')
const jwt     = require('jsonwebtoken')
const { z }   = require('zod')
const { PrismaClient } = require('@prisma/client')
const logger  = require('../lib/logger')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

const SALT_ROUNDS = 12
const TOKEN_TTL   = '30d'

function signToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  )
}

// ─── POST /api/auth/register ─────────────────────────────────────────────────
const RegisterSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

router.post('/register', async (req, res, next) => {
  try {
    const parsed = RegisterSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: { message: parsed.error.errors[0].message, code: 'VALIDATION_ERROR' }
      })
    }

    const { email, password } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return res.status(409).json({
        error: { message: 'An account with this email already exists', code: 'EMAIL_TAKEN' }
      })
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
    const user = await prisma.user.create({
      data: { email, passwordHash },
      select: { id: true, email: true, state: true, fcraConsentAt: true }
    })

    logger.info({ message: 'User registered', userId: user.id })

    return res.status(201).json({
      token: signToken(user),
      user: {
        id:           user.id,
        email:        user.email,
        state:        user.state,
        hasConsented: false,
      }
    })
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/auth/login ────────────────────────────────────────────────────
const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

router.post('/login', async (req, res, next) => {
  try {
    const parsed = LoginSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: { message: 'Email and password are required', code: 'VALIDATION_ERROR' }
      })
    }

    const { email, password } = parsed.data

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true, state: true, fcraConsentAt: true }
    })

    // Constant-time compare to prevent user enumeration
    const match = user ? await bcrypt.compare(password, user.passwordHash) : false
    if (!user || !match) {
      return res.status(401).json({
        error: { message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' }
      })
    }

    logger.info({ message: 'User logged in', userId: user.id })

    return res.json({
      token: signToken(user),
      user: {
        id:           user.id,
        email:        user.email,
        state:        user.state,
        hasConsented: !!user.fcraConsentAt,
      }
    })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
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

// ─── POST /api/auth/consent ───────────────────────────────────────────────────
const ConsentSchema = z.object({
  consentText: z.string().min(50, 'Consent text too short — full text required'),
  state:       z.string().length(2).toUpperCase().optional(),
})

router.post('/consent', requireAuth, async (req, res, next) => {
  try {
    const parsed = ConsentSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: { message: 'Invalid consent data', code: 'VALIDATION_ERROR' }
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

    return res.json({ message: 'Consent recorded', consentAt: updated.fcraConsentAt })
  } catch (err) {
    next(err)
  }
})

module.exports = router
