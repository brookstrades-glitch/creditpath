'use strict'

/**
 * Per-user rate limiter for credit pull endpoint
 * PRD §6.1: 3 pulls per user per 24 hours; 5-minute cooldown between pulls
 *
 * Uses in-memory store (Map) for prototype.
 * NOTE: For production with multiple Railway instances, replace with Redis.
 * Single Railway instance is fine for prototype — no state sharing issue.
 */

// Map<userId, { count: number, resetAt: Date, lastPullAt: Date }>
const pullRecords = new Map()

const MAX_PULLS_PER_DAY = parseInt(process.env.MAX_PULLS_PER_DAY || '3', 10)
const COOLDOWN_MS = 5 * 60 * 1000      // 5 minutes
const WINDOW_MS   = 24 * 60 * 60 * 1000 // 24 hours

/**
 * checkRateLimit — runs as middleware, only blocks if limit exceeded.
 * Does NOT increment the counter yet (that happens in recordPull after
 * validation passes, so bad requests don't burn a pull attempt).
 */
function checkRateLimit(req, res, next) {
  if (req.method !== 'POST' || !req.path.endsWith('/pull')) return next()

  const userId = req.user?.id
  if (!userId) return next()

  const now    = Date.now()
  const record = pullRecords.get(userId)
  if (!record) return next()

  // Block if within cooldown window
  const timeSinceLast = now - record.lastPullAt
  if (timeSinceLast < COOLDOWN_MS) {
    const retryAfterSeconds = Math.ceil((COOLDOWN_MS - timeSinceLast) / 1000)
    return res.status(429).json({
      error: {
        message: 'Please wait before pulling again',
        code: 'COOLDOWN_ACTIVE',
        retryAfter: retryAfterSeconds,
        retryAfterMs: COOLDOWN_MS - timeSinceLast,
      }
    })
  }

  // Block if daily limit hit and window hasn't reset
  if (now < record.resetAt && record.count >= MAX_PULLS_PER_DAY) {
    const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000)
    return res.status(429).json({
      error: {
        message: `Daily pull limit (${MAX_PULLS_PER_DAY}) reached`,
        code: 'DAILY_LIMIT_REACHED',
        retryAfter: retryAfterSeconds,
        retryAfterMs: record.resetAt - now,
        resetsAt: new Date(record.resetAt).toISOString(),
      }
    })
  }

  next()
}

/**
 * recordPull — call this AFTER validation passes in the route handler.
 * Increments the counter so failed/invalid requests don't waste pull quota.
 */
function recordPull(userId) {
  const now    = Date.now()
  const record = pullRecords.get(userId)

  if (!record || now >= record.resetAt) {
    pullRecords.set(userId, { count: 1, resetAt: now + WINDOW_MS, lastPullAt: now })
  } else {
    record.count++
    record.lastPullAt = now
  }
}

module.exports = { checkRateLimit, recordPull }
