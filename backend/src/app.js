'use strict'

// Load .env.local first (dev overrides), then fall back to .env
// Railway sets env vars directly — dotenv is a no-op in production
// __dirname = backend/src, so ../ = backend/
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })

const express = require('express')
const helmet  = require('helmet')
const cors    = require('cors')
const cookieParser = require('cookie-parser')
const path    = require('path')
// JWT auth — see middleware/auth.js

const logger  = require('./lib/logger')
const { requireAuth } = require('./middleware/auth')
const rateLimiter = require('./middleware/rateLimit')

// Routes
const authRoutes       = require('./routes/auth')
const creditRoutes     = require('./routes/credit')
const disputeRoutes    = require('./routes/disputes')
const letterRoutes     = require('./routes/letters')
const negotiateRoutes  = require('./routes/negotiate')
const toolRoutes       = require('./routes/tools')
const accountRoutes    = require('./routes/account')

const app = express()
const PORT = process.env.PORT || 3001

// ─── Security middleware ──────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Managed by Netlify headers for frontend
}))

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
  credentials: true, // Required for httpOnly cookie
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
}))

app.use(cookieParser())
app.use(express.json({ limit: '1mb' })) // Credit data payloads can be large

// Auth is handled per-route via requireAuth middleware (JWT)

// ─── Health check — Railway uses this ────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ─── Public routes ────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)

// ─── Protected routes — all require valid Clerk JWT ──────────────────────────
app.use('/api/credit',    requireAuth, rateLimiter, creditRoutes)
app.use('/api/disputes',  requireAuth, disputeRoutes)
app.use('/api/letters',   requireAuth, letterRoutes)
app.use('/api/negotiate', requireAuth, negotiateRoutes)
app.use('/api/tools',     requireAuth, toolRoutes)
app.use('/api/account',   requireAuth, accountRoutes)

// ─── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Never log SSN, api-secret, or full_feed
  logger.error({
    message: err.message,
    stack:   process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path:    req.path,
    method:  req.method,
  })

  const status = err.status || 500
  res.status(status).json({
    error: {
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
      code: err.code || 'INTERNAL_ERROR',
    }
  })
})

// ─── Static frontend (production only) ───────────────────────────────────────
// When deployed to Railway, Express serves the Vite build so both frontend
// and backend live on the same origin — no CORS needed, no Netlify required.
// In development, Vite's dev server handles the frontend separately.
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../frontend/dist')
  app.use(express.static(distPath))
  // Client-side routing — any non-API path serves index.html
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

// ─── 404 handler (API routes only in production) ──────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: { message: 'Not found', code: 'NOT_FOUND' } })
})

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`CreditPath backend running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`)
})

module.exports = app // For testing
