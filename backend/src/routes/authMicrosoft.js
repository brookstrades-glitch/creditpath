'use strict'

/**
 * Microsoft Entra ID (Azure AD) OAuth 2.0 + OIDC flow
 *
 *   GET /api/auth/microsoft          → redirect browser to Microsoft login
 *   GET /api/auth/microsoft/callback → handle code exchange, issue our JWT
 */

const { Router } = require('express')
const crypto     = require('crypto')
const axios      = require('axios')
const jwt        = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')
const logger     = require('../lib/logger')

const router  = Router()
const prisma  = new PrismaClient()

const CLIENT_ID     = process.env.MICROSOFT_CLIENT_ID
const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET
// Use 'consumers' to restrict to personal Microsoft accounts only (Outlook, Hotmail, Live)
// This avoids the "Need admin approval" screen that org/work accounts trigger.
// Change to 'common' if you want to support work accounts too.
const TENANT_ID     = process.env.MICROSOFT_TENANT_ID || 'consumers'
const REDIRECT_URI  = process.env.MICROSOFT_REDIRECT_URI
  || 'https://creditpath-production.up.railway.app/api/auth/microsoft/callback'
const FRONTEND_URL  = process.env.FRONTEND_URL || 'https://4nbailey.shop'

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' })
}

// ─── GET /api/auth/microsoft ──────────────────────────────────────────────────
// Kick off the OAuth flow — set a state cookie then redirect to Microsoft
router.get('/', (req, res) => {
  if (!CLIENT_ID) {
    return res.status(503).json({ error: { message: 'Microsoft OAuth not configured', code: 'NOT_CONFIGURED' } })
  }

  const state = crypto.randomBytes(16).toString('hex')

  // Store state in a short-lived cookie for CSRF validation on callback
  res.cookie('ms_oauth_state', state, {
    httpOnly: true,
    secure:   true,
    sameSite: 'lax',
    maxAge:   10 * 60 * 1000, // 10 minutes
  })

  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    response_type: 'code',
    redirect_uri:  REDIRECT_URI,
    response_mode: 'query',
    scope:         'openid email profile',
    state,
  })

  res.redirect(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize?${params}`)
})

// ─── GET /api/auth/microsoft/callback ────────────────────────────────────────
// Microsoft redirects here with ?code=...&state=...
router.get('/callback', async (req, res) => {
  const { code, state, error: oauthError } = req.query

  if (oauthError) {
    logger.warn({ message: 'Microsoft OAuth denied', error: oauthError })
    return res.redirect(`${FRONTEND_URL}/sign-in?error=microsoft_denied`)
  }

  // Validate CSRF state
  const savedState = req.cookies?.ms_oauth_state
  if (!savedState || savedState !== state) {
    logger.warn({ message: 'Microsoft OAuth invalid state' })
    return res.redirect(`${FRONTEND_URL}/sign-in?error=invalid_state`)
  }
  res.clearCookie('ms_oauth_state')

  try {
    // ── 1. Exchange authorization code for tokens ──────────────────────────
    const tokenRes = await axios.post(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri:  REDIRECT_URI,
        grant_type:    'authorization_code',
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    )

    const { id_token } = tokenRes.data

    // ── 2. Decode the OIDC ID token (trust it — came from Microsoft's endpoint)
    const [, payloadB64] = id_token.split('.')
    const idPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))

    // Microsoft can put email in 'email' or 'preferred_username' (for orgs)
    const email = idPayload.email || idPayload.preferred_username
    if (!email || !email.includes('@')) {
      logger.warn({ message: 'Microsoft OAuth: no email in token', idPayload })
      return res.redirect(`${FRONTEND_URL}/sign-in?error=no_email`)
    }

    // ── 3. Upsert user — create if first time, else just log in ───────────
    let user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: '', // OAuth users have no password — empty string is valid
        },
      })
      logger.info({ message: 'New user via Microsoft OAuth', userId: user.id })
    } else {
      logger.info({ message: 'Existing user signed in via Microsoft OAuth', userId: user.id })
    }

    // ── 4. Issue our own JWT and redirect to frontend ──────────────────────
    const token      = signToken(user.id)
    const hasConsent = !!user.fcraConsentAt
    const dest       = hasConsent ? 'dashboard' : 'consent'

    // Pass token back to the frontend via the /auth/callback page
    res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}&dest=${dest}`)

  } catch (err) {
    logger.error({ message: 'Microsoft OAuth callback error', error: err.message })
    res.redirect(`${FRONTEND_URL}/sign-in?error=oauth_failed`)
  }
})

module.exports = router
