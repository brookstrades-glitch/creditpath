'use strict'

/**
 * Action Plan Generator — PRD §5.3.1
 *
 * Ranks items by estimated credit score improvement potential.
 * Rank 1 = highest impact.
 *
 * The ranking heuristic is from PRD §5.3.1, which is based on
 * documented FICO/VantageScore impact factors.
 */
const { attachExpiryData } = require('./fcraExpiry')

// Payment code definitions — PRD §5.9
const PAYMENT_CODES = {
  'UR': { label: 'Unrated',                        negative: false },
  '0':  { label: 'Too new to rate',                negative: false },
  'E':  { label: 'Zero balance, current',          negative: false },
  '1':  { label: 'Pays as agreed',                 negative: false },
  '2':  { label: '30-59 days past due',            negative: true  },
  '3':  { label: '60-89 days past due',            negative: true  },
  '4':  { label: '90-119 days past due',           negative: true  },
  '5':  { label: '120+ days past due',             negative: true  },
  '6':  { label: 'Collection account',             negative: true  },
  '7A': { label: 'Chapter 13 included',            negative: true  },
  '7B': { label: 'Wage Earner Plan',               negative: true  },
  '8':  { label: 'Repossession',                   negative: true  },
  '8A': { label: 'Voluntary repossession',         negative: true  },
  '8P': { label: 'Paying repossession account',    negative: true  },
  '9':  { label: 'Charge-off',                     negative: true  },
  '9P': { label: 'Paying charge-off account',      negative: true  },
  'B':  { label: 'Account condition change',       negative: false },
  'C':  { label: 'Current',                        negative: false },
  'F':  { label: 'Foreclosure',                    negative: true  },
  'FP': { label: 'Foreclosure proceedings started',negative: true  },
  'M':  { label: 'Insurance claim / BK discharged',negative: true  },
}

/**
 * Generate a ranked action plan from the full_feed
 * @param {object} fullFeed - Processed iSoftpull full_feed
 * @returns {Array} Ranked action items, each with recommended actions and letters
 */
function generateActionPlan(fullFeed) {
  const actions = []
  const itemsWithExpiry = attachExpiryData(fullFeed)

  // ── Rank 1: Collections with balance ────────────────────────────────────────
  for (const item of (fullFeed.collections || [])) {
    const expiryItem = itemsWithExpiry.find(i => i.account_number === item.account_number)
    actions.push({
      rank: 1,
      priority: 'critical',
      type: 'collection',
      title: `Collection: ${item.original_creditor || item.collection_agency}`,
      amount: item.balance,
      bureaus: item.bureaus,
      description: `Balance of $${item.balance?.toLocaleString()} with ${item.collection_agency}`,
      actions: [
        { label: 'Send FDCPA Debt Validation Letter first', letter: 14, path: 'collector' },
        { label: 'If validated and accurate: negotiate pay-for-delete', letter: 12, path: 'creditor' },
        { label: 'If inaccurate: dispute with bureau', letter: 3, path: 'bureau' },
      ],
      fcra: expiryItem?.fcra || null,
      raw: item,
    })
  }

  // ── Rank 2: Charge-offs ──────────────────────────────────────────────────────
  for (const item of (fullFeed.negative_accounts || [])) {
    const code = item.payment_code
    const expiryItem = itemsWithExpiry.find(i => i.account_number === item.account_number)

    if (code === '9' || code === '9P') {
      actions.push({
        rank: 2,
        priority: 'critical',
        type: 'charge_off',
        title: `Charge-off: ${item.creditor}`,
        amount: item.balance,
        bureaus: item.bureaus,
        description: `Charged off account with ${item.creditor}`,
        actions: [
          { label: 'Dispute if any information is inaccurate', letter: 3, path: 'bureau' },
          expiryItem?.fcra?.isExpired
            ? { label: 'FCRA expiry exceeded — dispute for removal immediately', letter: 4, path: 'bureau' }
            : { label: 'Check FCRA reporting expiry date below', letter: null, path: null },
        ].filter(a => a.letter !== null || a.label.includes('expiry')),
        fcra: expiryItem?.fcra || null,
        raw: item,
      })
    }
  }

  // ── Rank 3: Items past FCRA reporting expiry ────────────────────────────────
  for (const item of itemsWithExpiry) {
    if (item.fcra?.isExpired && item.itemType !== 'collection' && item.itemType !== 'charge_off') {
      actions.push({
        rank: 3,
        priority: 'high',
        type: 'expired_item',
        title: `Expired Item: ${item.creditor || item.type || 'Unknown'}`,
        bureaus: item.bureaus,
        description: `FCRA reporting period has expired — dispute immediately for removal`,
        actions: [
          { label: 'Request removal of outdated information', letter: 4, path: 'bureau' },
        ],
        fcra: item.fcra,
        raw: item,
      })
    }
  }

  // ── Rank 4: Late payments 90+ days ──────────────────────────────────────────
  for (const item of (fullFeed.negative_accounts || [])) {
    const code = item.payment_code
    if (code === '4' || code === '5') {
      const expiryItem = itemsWithExpiry.find(i => i.account_number === item.account_number)
      actions.push({
        rank: 4,
        priority: 'high',
        type: 'late_payment_severe',
        title: `Severe Late Payment: ${item.creditor}`,
        bureaus: item.bureaus,
        description: `${PAYMENT_CODES[code]?.label} on ${item.creditor}`,
        actions: [
          { label: 'Dispute if inaccurate', letter: 3, path: 'bureau' },
          { label: 'Request goodwill adjustment if isolated incident', letter: 11, path: 'creditor' },
        ],
        fcra: expiryItem?.fcra || null,
        raw: item,
      })
    }
  }

  // ── Rank 5: High credit utilization ─────────────────────────────────────────
  const revolvingAccounts = (fullFeed.trade_accounts || []).filter(a => a.account_type === 'Revolving' && a.credit_limit > 0)
  if (revolvingAccounts.length > 0) {
    const totalBalance = revolvingAccounts.reduce((sum, a) => sum + (a.balance || 0), 0)
    const totalLimit   = revolvingAccounts.reduce((sum, a) => sum + (a.credit_limit || 0), 0)
    const utilization  = totalLimit > 0 ? totalBalance / totalLimit : 0

    if (utilization > 0.30) {
      actions.push({
        rank: 5,
        priority: 'medium',
        type: 'high_utilization',
        title: `High Credit Utilization: ${Math.round(utilization * 100)}%`,
        bureaus: ['equifax', 'experian', 'transunion'],
        description: `Revolving utilization is ${Math.round(utilization * 100)}% — above the 30% threshold. Paying down $${Math.round(totalBalance - totalLimit * 0.30).toLocaleString()} would bring it under 30%.`,
        actions: [
          { label: 'Pay down revolving balances below 30% utilization', letter: null, path: null },
          { label: 'Request credit limit increases (no hard pull if possible)', letter: null, path: null },
        ],
        utilization,
        totalBalance,
        totalLimit,
        raw: null,
      })
    }
  }

  // ── Rank 6: Late payments 30-60 days ────────────────────────────────────────
  for (const item of (fullFeed.negative_accounts || [])) {
    const code = item.payment_code
    if (code === '2' || code === '3') {
      actions.push({
        rank: 6,
        priority: 'medium',
        type: 'late_payment_mild',
        title: `Late Payment: ${item.creditor}`,
        bureaus: item.bureaus,
        description: `${PAYMENT_CODES[code]?.label} on ${item.creditor}`,
        actions: [
          { label: 'Dispute if inaccurate', letter: 3, path: 'bureau' },
        ],
        raw: item,
      })
    }
  }

  // ── Rank 7: Excessive inquiries ──────────────────────────────────────────────
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const recentInquiries = (fullFeed.inquiries || []).filter(i => new Date(i.inquiry_date) >= sixMonthsAgo)

  if (recentInquiries.length >= 4) {
    actions.push({
      rank: 7,
      priority: 'medium',
      type: 'excessive_inquiries',
      title: `${recentInquiries.length} Inquiries in Last 6 Months`,
      bureaus: [...new Set(recentInquiries.flatMap(i => i.bureaus || []))],
      description: `${recentInquiries.length} inquiries in the past 6 months — above the 4-inquiry threshold. Dispute any you did not authorize.`,
      actions: [
        { label: 'Dispute unauthorized inquiries', letter: 5, path: 'bureau' },
      ],
      inquiries: recentInquiries,
      raw: null,
    })
  }

  // ── Rank 8: Public records ───────────────────────────────────────────────────
  for (const item of (fullFeed.public_records || [])) {
    const expiryItem = itemsWithExpiry.find(i => i.filed_date === item.filed_date)
    actions.push({
      rank: 8,
      priority: 'medium',
      type: 'public_record',
      title: `Public Record: ${item.type}`,
      bureaus: item.bureaus,
      description: `${item.type} — $${item.amount?.toLocaleString()} — filed ${item.filed_date}`,
      actions: [
        expiryItem?.fcra?.isExpired
          ? { label: 'FCRA expiry exceeded — dispute for removal', letter: 4, path: 'bureau' }
          : { label: 'Verify FCRA reporting expiry date', letter: null, path: null },
      ],
      fcra: expiryItem?.fcra || null,
      raw: item,
    })
  }

  // Sort by rank (ascending = highest impact first), then by amount (descending)
  actions.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank
    return (b.amount || 0) - (a.amount || 0)
  })

  return actions
}

module.exports = { generateActionPlan, PAYMENT_CODES }
