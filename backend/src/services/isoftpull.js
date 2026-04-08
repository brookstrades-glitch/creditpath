'use strict'

/**
 * iSoftpull Full Feed API v2 client
 *
 * PRD §5.2.1 — Endpoint, headers, field spec
 * PRD §11.4 — 5 sandbox test applicants
 *
 * USE_MOCK=true in .env.local to use mock data while iSoftpull account is pending.
 * Swap in real API key/secret via Railway env vars when account is confirmed.
 */
const axios  = require('axios')
const logger = require('../lib/logger')

const ISOFTPULL_URL = 'https://app.isoftpull.com/api/v2/reports'
const USE_MOCK = process.env.USE_MOCK === 'true'

// ─── Mock data — 5 sandbox test applicants from PRD §11.4 ───────────────────
const MOCK_RESPONSES = {
  '111111111': require('../mocks/steve-johnson.json'),  // ~700 score
  '222222222': require('../mocks/john-dough.json'),     // ~600 score
  '333333333': require('../mocks/susie-que.json'),      // ~500 score
  '444444444': require('../mocks/chris-iceman.json'),   // Frozen report
  '555555555': require('../mocks/jeff-nascore.json'),   // No score
}

const DEFAULT_MOCK = require('../mocks/steve-johnson.json')

/**
 * Normalize the raw iSoftpull API response (or mock) to the flat shape
 * expected by credit.js, actionPlan.js, and fcraExpiry.js.
 *
 * Raw shape:  { reports: { equifax, experian, transunion }, full_feed: { credit_score, trade_accounts, ... } }
 * Flat shape: { equifax, experian, transunion, scores: { equifax, experian, transunion }, trade_accounts, ... }
 *
 * @param {object} raw - Raw API or mock response
 * @returns {object} Normalized flat report
 */
function normalizeReport(raw) {
  const cs = raw.full_feed?.credit_score || {}
  return {
    // Bureau-level status
    equifax:    raw.reports?.equifax    || { status: 'unknown' },
    experian:   raw.reports?.experian   || { status: 'unknown' },
    transunion: raw.reports?.transunion || { status: 'unknown' },

    // Scores grouped by bureau
    scores: {
      equifax:    { fico4:   cs.equifax_fico4    ?? null, vantage4: cs.equifax_vantage4    ?? null },
      transunion: { fico4:   cs.transunion_fico4 ?? null, vantage4: cs.transunion_vantage4 ?? null },
      experian:   { fico8:   cs.experian_fico8   ?? null, vantage4: cs.experian_vantage4   ?? null },
    },
    reason_codes: cs.reason_codes || [],

    // Tradeline data
    trade_accounts:   raw.full_feed?.trade_accounts   || [],
    negative_accounts: raw.full_feed?.negative_accounts || [],
    collections:      raw.full_feed?.collections      || [],
    public_records:   raw.full_feed?.public_records   || [],
    inquiries:        raw.full_feed?.inquiries        || [],

    // Preserve mock metadata for debugging
    _mock:      raw._mock      || false,
    _applicant: raw._applicant || null,
    _scenario:  raw._scenario  || null,
  }
}

/**
 * Pull credit report from iSoftpull
 * @param {object} fields - All required/optional pull fields per PRD §5.2.1
 * @param {boolean} isHardPull - Hard pull requires SSN + DOB + separate consent
 * @returns {object} Processed report (SSN stripped, full_feed processed)
 */
async function pullCreditReport(fields, isHardPull = false) {
  if (USE_MOCK) {
    logger.info('iSoftpull: using mock data (USE_MOCK=true)')
    const mockData = MOCK_RESPONSES[fields.ssn] || DEFAULT_MOCK
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800))
    return normalizeReport(mockData)
  }

  if (!process.env.ISOFTPULL_API_KEY || !process.env.ISOFTPULL_API_SECRET) {
    throw new Error('iSoftpull API credentials not configured. Set ISOFTPULL_API_KEY and ISOFTPULL_API_SECRET in Railway env vars.')
  }

  // Build request body — field names match iSoftpull API exactly (PRD §5.2.1)
  const body = {
    first_name: fields.first_name,
    last_name:  fields.last_name,
    address:    fields.address,
    city:       fields.city,
    State:      fields.State, // Full state name: "California" not "CA"
    zip:        fields.zip,
    // config parameter value — BLOCKING: get from Postman collection
    // config: process.env.ISOFTPULL_CONFIG_SOFT || 'TBD',
  }

  if (isHardPull) {
    // SSN: no dashes — "212074628" NOT "212-07-4628"
    body.ssn           = fields.ssn
    // DOB: mm/dd/yyyy format
    body.date_of_birth = fields.date_of_birth
    // config parameter for hard pull — from Postman collection
    // body.config = process.env.ISOFTPULL_CONFIG_HARD || 'TBD'
  }

  let response
  try {
    response = await axios.post(ISOFTPULL_URL, body, {
      headers: {
        'api-key':    process.env.ISOFTPULL_API_KEY,
        'api-secret': process.env.ISOFTPULL_API_SECRET,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30-second timeout per PRD §6.3
    })
  } catch (err) {
    if (err.code === 'ECONNABORTED') {
      const e = new Error('Credit bureau request timed out. Please try again.')
      e.code = 'ISOFTPULL_TIMEOUT'
      throw e
    }
    throw err
  }

  return normalizeReport(response.data)
}

module.exports = { pullCreditReport }
