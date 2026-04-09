'use strict'

const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: { message: 'Authentication required', code: 'UNAUTHORIZED' } })
  }

  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id:            true,
        email:         true,
        name:          true,
        state:         true,
        fcraConsentAt: true,
        consentText:   true,
      }
    })

    if (!user) {
      return res.status(401).json({ error: { message: 'User not found', code: 'UNAUTHORIZED' } })
    }

    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: { message: 'Invalid or expired token', code: 'UNAUTHORIZED' } })
  }
}

module.exports = { requireAuth }
