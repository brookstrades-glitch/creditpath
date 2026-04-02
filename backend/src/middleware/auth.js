'use strict'

/**
 * Clerk JWT verification middleware
 * Verifies the session token from Clerk and attaches userId to req
 */
const { createClerkClient } = require('@clerk/backend')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
})

async function requireAuth(req, res, next) {
  try {
    // Clerk session token comes from the Authorization header
    // (Clerk React SDK sends it automatically when configured)
    const sessionToken = req.headers.authorization?.replace('Bearer ', '')

    if (!sessionToken) {
      return res.status(401).json({
        error: { message: 'Authentication required', code: 'UNAUTHORIZED' }
      })
    }

    // Verify the session token with Clerk
    const { sub: clerkId } = await clerk.verifyToken(sessionToken)

    if (!clerkId) {
      return res.status(401).json({
        error: { message: 'Invalid session', code: 'INVALID_SESSION' }
      })
    }

    // Look up the user in our database by Clerk ID
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: {
        id: true,
        clerkId: true,
        email: true,
        state: true,
        fcraConsentAt: true,
        consentText: true,
      }
    })

    if (!user) {
      // User authenticated with Clerk but not yet in our DB
      // This happens if registration webhook hasn't fired yet
      return res.status(401).json({
        error: { message: 'User profile not found', code: 'USER_NOT_FOUND' }
      })
    }

    // Attach user to request — available in all route handlers
    req.user = user
    next()
  } catch (err) {
    // Token expired, invalid, or Clerk error
    return res.status(401).json({
      error: { message: 'Authentication failed', code: 'AUTH_FAILED' }
    })
  }
}

module.exports = { requireAuth }
