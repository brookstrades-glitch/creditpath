'use strict'

/**
 * Tools routes — utility calculators
 *
 *   POST /api/tools/dti       — Debt-to-income calculator
 *   POST /api/tools/simulate  — Credit score improvement simulator
 *
 * Both are stateless calculations — no DB writes needed.
 * Per PRD §5.7: 20% DTI rule, 12 FICO scoring factors with point values.
 */

const express = require('express')
const { z }   = require('zod')

const router = express.Router()

// ─── POST /api/tools/dti ──────────────────────────────────────────────────────
// Debt-to-income ratio calculator
// Rule: total monthly debt / gross monthly income
// PRD §5.7: Flag if DTI > 20% (lender threshold)
const DtiSchema = z.object({
  grossMonthlyIncome: z.number().positive(),
  monthlyDebts: z.array(z.object({
    label:   z.string(),
    payment: z.number().nonnegative(),
  })).min(1),
})

router.post('/dti', (req, res) => {
  const parsed = DtiSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: { message: 'Validation error', code: 'VALIDATION_ERROR', details: parsed.error.flatten() }
    })
  }

  const { grossMonthlyIncome, monthlyDebts } = parsed.data
  const totalMonthlyDebt = monthlyDebts.reduce((sum, d) => sum + d.payment, 0)
  const dtiRatio         = totalMonthlyDebt / grossMonthlyIncome
  const dtiPercent       = Math.round(dtiRatio * 1000) / 10 // One decimal place

  // To reach 20% DTI threshold
  const targetDebt        = grossMonthlyIncome * 0.20
  const paydownNeeded     = Math.max(0, totalMonthlyDebt - targetDebt)

  return res.json({
    grossMonthlyIncome,
    totalMonthlyDebt,
    dtiPercent,
    dtiRatio,
    threshold:      20,
    exceedsThreshold: dtiPercent > 20,
    paydownNeeded:  Math.round(paydownNeeded),
    status: dtiPercent <= 20 ? 'good' : dtiPercent <= 35 ? 'fair' : 'high',
    breakdown: monthlyDebts.map(d => ({
      ...d,
      percent: Math.round((d.payment / grossMonthlyIncome) * 1000) / 10,
    })),
  })
})

// ─── POST /api/tools/simulate ─────────────────────────────────────────────────
// Credit score improvement simulator
// Based on the 12 FICO scoring factors with point values (PRD §5.7)
const SimulateSchema = z.object({
  currentScore: z.number().int().min(300).max(850),
  actions: z.array(z.enum([
    'pay_collections',
    'remove_collection',
    'remove_charge_off',
    'pay_down_utilization_30',
    'pay_down_utilization_10',
    'remove_late_90_plus',
    'remove_late_30_60',
    'remove_inquiry',
    'remove_public_record',
    'remove_bankruptcy',
    'add_positive_tradeline',
    'authorized_user',
  ])).min(1),
  // Context needed for accurate simulation
  utilization:       z.number().min(0).max(1).optional(),
  collectionBalance: z.number().nonnegative().optional(),
})

// Point impact estimates — from PRD §5.7 (Credit Repair Made E-Z, FICO research)
const ACTION_IMPACTS = {
  pay_collections:         { min: 10,  max: 45,  label: 'Pay off collection accounts' },
  remove_collection:       { min: 30,  max: 100, label: 'Remove collection from report' },
  remove_charge_off:       { min: 20,  max: 80,  label: 'Remove charge-off from report' },
  pay_down_utilization_30: { min: 20,  max: 60,  label: 'Reduce utilization below 30%' },
  pay_down_utilization_10: { min: 30,  max: 90,  label: 'Reduce utilization below 10%' },
  remove_late_90_plus:     { min: 15,  max: 50,  label: 'Remove 90+ day late payment' },
  remove_late_30_60:       { min: 10,  max: 30,  label: 'Remove 30-60 day late payment' },
  remove_inquiry:          { min: 3,   max: 12,  label: 'Remove unauthorized inquiry' },
  remove_public_record:    { min: 20,  max: 75,  label: 'Remove public record' },
  remove_bankruptcy:       { min: 40,  max: 150, label: 'Remove bankruptcy (if errors)' },
  add_positive_tradeline:  { min: 10,  max: 40,  label: 'Add positive tradeline' },
  authorized_user:         { min: 15,  max: 50,  label: 'Become authorized user on good account' },
}

router.post('/simulate', (req, res) => {
  const parsed = SimulateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: { message: 'Validation error', code: 'VALIDATION_ERROR', details: parsed.error.flatten() }
    })
  }

  const { currentScore, actions } = parsed.data

  // Deduplicate actions
  const uniqueActions = [...new Set(actions)]

  const actionDetails = uniqueActions.map(action => {
    const impact = ACTION_IMPACTS[action]
    // Use midpoint for estimate, with diminishing returns for high scores
    const diminishingFactor = currentScore > 750 ? 0.5 : currentScore > 700 ? 0.75 : 1.0
    const estimatedMin = Math.round(impact.min * diminishingFactor)
    const estimatedMax = Math.round(impact.max * diminishingFactor)
    const estimatedMid = Math.round((estimatedMin + estimatedMax) / 2)
    return { action, label: impact.label, estimatedMin, estimatedMax, estimatedMid }
  })

  // Sum midpoints, capped at 850
  const totalMin = actionDetails.reduce((sum, a) => sum + a.estimatedMin, 0)
  const totalMax = actionDetails.reduce((sum, a) => sum + a.estimatedMax, 0)
  const totalMid = actionDetails.reduce((sum, a) => sum + a.estimatedMid, 0)

  const projectedMin = Math.min(850, currentScore + totalMin)
  const projectedMax = Math.min(850, currentScore + totalMax)
  const projectedMid = Math.min(850, currentScore + totalMid)

  const scoreCategory = (score) => {
    if (score >= 750) return 'excellent'
    if (score >= 700) return 'good'
    if (score >= 640) return 'fair'
    if (score >= 580) return 'poor'
    return 'bad'
  }

  return res.json({
    currentScore,
    currentCategory: scoreCategory(currentScore),
    projectedMin,
    projectedMax,
    projectedMid,
    projectedCategory: scoreCategory(projectedMid),
    gainMin: totalMin,
    gainMax: totalMax,
    gainMid: totalMid,
    actions: actionDetails,
    disclaimer: 'These are estimates only. Actual score changes depend on the full profile and scoring model.',
  })
})

module.exports = router
