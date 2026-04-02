'use strict'

/**
 * Application logger
 * SECURITY RULE: Never log SSN, api-secret, full_feed, or raw credit data.
 * Winston strips these in production via the sanitize format.
 */
const { createLogger, format, transports } = require('winston')

const SENSITIVE_KEYS = ['ssn', 'api-secret', 'apiSecret', 'full_feed', 'fullFeed', 'password', 'passwordHash']

// Sanitize sensitive fields from log objects
const sanitize = format((info) => {
  if (info.message && typeof info.message === 'object') {
    SENSITIVE_KEYS.forEach(key => {
      if (info.message[key]) info.message[key] = '[REDACTED]'
    })
  }
  return info
})

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: format.combine(
    sanitize(),
    format.timestamp(),
    process.env.NODE_ENV === 'production'
      ? format.json()
      : format.combine(format.colorize(), format.simple())
  ),
  transports: [
    new transports.Console(),
  ],
})

module.exports = logger
