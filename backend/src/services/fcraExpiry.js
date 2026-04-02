'use strict'

/**
 * FCRA §605 Reporting Time Limit Calculator
 *
 * All formulas are from the PRD §5.4.1, which is based on FCRA §605(a) and §605(c).
 * CRITICAL: The §605(c) formula for collections/charge-offs is:
 *   Expiry = delinquencyDate + 180 days + 7 years
 *   NOT: collection date + 7 years
 */

const { addDays, addYears, differenceInDays, isAfter, isBefore } = require('date-fns')

// Reporting limits by item type (in years), per FCRA §605(a)
const REPORTING_LIMITS = {
  bankruptcy_ch7:    10, // §605(a)(1)
  bankruptcy_ch11:   10,
  bankruptcy_ch12:   10,
  collection:         7, // §605(c) — clock starts 180 days after delinquency
  charge_off:         7, // §605(c)
  civil_judgment:     7, // §605(a)(2) — or statute of limitations, whichever longer
  civil_suit:         7,
  arrest:             7,
  paid_tax_lien:      7, // §605(a)(3) — from date of payment
  late_payment:       7, // §605(a)(5)
  other_adverse:      7,
  criminal_conviction: null, // §605(a)(5) exception — no limit
}

/**
 * Calculate FCRA expiry date for a credit item
 *
 * @param {string} itemType - One of the REPORTING_LIMITS keys
 * @param {Date|string} referenceDate - The relevant date for the clock start
 * @param {Date|string|null} delinquencyDate - Required for collection/charge-off (§605(c))
 * @returns {{ expiryDate: Date|null, isExpired: boolean, daysRemaining: number|null, trafficLight: string }}
 */
function calculateExpiry(itemType, referenceDate, delinquencyDate = null) {
  const type = itemType.toLowerCase().replace(/-/g, '_')

  // Criminal convictions — no reporting limit
  if (type === 'criminal_conviction') {
    return {
      expiryDate:    null,
      isExpired:     false,
      daysRemaining: null,
      trafficLight:  'none',
      note:          'Criminal convictions may be reported indefinitely under FCRA §605(a)(5) exception',
    }
  }

  const limitYears = REPORTING_LIMITS[type]
  if (!limitYears) {
    return {
      expiryDate:    null,
      isExpired:     false,
      daysRemaining: null,
      trafficLight:  'unknown',
      note:          `Unknown item type: ${itemType}`,
    }
  }

  let clockStart

  if (type === 'collection' || type === 'charge_off') {
    // FCRA §605(c): clock starts 180 days after the delinquency that PRECEDED
    // the collection or charge-off — NOT the collection date itself
    if (!delinquencyDate) {
      return {
        expiryDate:    null,
        isExpired:     false,
        daysRemaining: null,
        trafficLight:  'unknown',
        note:          'Delinquency date required for §605(c) calculation',
      }
    }
    clockStart = addDays(new Date(delinquencyDate), 180)
  } else {
    clockStart = new Date(referenceDate)
  }

  const expiryDate = addYears(clockStart, limitYears)
  const today      = new Date()
  const isExpired  = isAfter(today, expiryDate)
  const daysRemaining = isExpired ? 0 : differenceInDays(expiryDate, today)

  // Traffic light per PRD §5.4.1
  let trafficLight
  if (isExpired) {
    trafficLight = 'red' // Already expired — dispute immediately
  } else if (daysRemaining < 365) {
    trafficLight = 'red' // <1 year remaining
  } else if (daysRemaining < 730) {
    trafficLight = 'amber' // 1-2 years remaining
  } else {
    trafficLight = 'green' // >2 years remaining
  }

  return {
    expiryDate,
    isExpired,
    daysRemaining: isExpired ? 0 : daysRemaining,
    trafficLight,
    clockStart,
    limitYears,
  }
}

/**
 * Process all items in a full_feed and attach FCRA expiry data
 */
function attachExpiryData(fullFeed) {
  const results = []

  // Negative accounts (late payments, charge-offs, etc.)
  for (const account of (fullFeed.negative_accounts || [])) {
    const code = account.payment_code
    let itemType = 'other_adverse'

    if (code === '9' || code === '9P') itemType = 'charge_off'
    else if (code === '7A' || code === '7B') itemType = 'bankruptcy_ch13'
    else if (['2','3','4','5'].includes(code)) itemType = 'late_payment'
    else if (code === 'F' || code === 'FP') itemType = 'civil_judgment'

    const expiry = calculateExpiry(itemType, account.delinquency_date || account.opened_date, account.delinquency_date)
    results.push({ ...account, fcra: expiry, itemType })
  }

  // Collections — §605(c) formula
  for (const coll of (fullFeed.collections || [])) {
    const expiry = calculateExpiry('collection', coll.opened_date, coll.delinquency_date)
    results.push({ ...coll, fcra: expiry, itemType: 'collection' })
  }

  // Public records
  for (const pr of (fullFeed.public_records || [])) {
    const itemType = pr.type?.toLowerCase().includes('bankrupt') ? 'bankruptcy_ch7' : 'civil_judgment'
    const expiry = calculateExpiry(itemType, pr.filed_date)
    results.push({ ...pr, fcra: expiry, itemType })
  }

  return results
}

module.exports = { calculateExpiry, attachExpiryData }
