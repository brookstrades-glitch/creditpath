import { useState } from 'react'
import Navbar from '../components/ui/Navbar'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Alert from '../components/ui/Alert'
import api from '../lib/api'

// ─── DTI Calculator ───────────────────────────────────────────────────────────
function DTICalculator() {
  const [income, setIncome]   = useState('')
  const [debts,  setDebts]    = useState([{ label: 'Rent/Mortgage', payment: '' }])
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,  setError]    = useState(null)

  function addDebt() { setDebts(d => [...d, { label: '', payment: '' }]) }
  function removeDebt(i) { setDebts(d => d.filter((_, idx) => idx !== i)) }
  function updateDebt(i, field, val) {
    setDebts(d => d.map((item, idx) => idx === i ? { ...item, [field]: val } : item))
  }

  async function calculate() {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post('/tools/dti', {
        grossMonthlyIncome: parseFloat(income),
        monthlyDebts: debts
          .filter(d => d.payment)
          .map(d => ({ label: d.label || 'Debt', payment: parseFloat(d.payment) })),
      })
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Calculation failed')
    } finally { setLoading(false) }
  }

  const dtiColor = result
    ? result.dtiPercent <= 20  ? 'text-green-600'
    : result.dtiPercent <= 35  ? 'text-yellow-600'
    : 'text-red-600'
    : ''

  return (
    <Card>
      <CardHeader><CardTitle>Debt-to-Income (DTI) Calculator</CardTitle></CardHeader>
      <div className="space-y-4">
        <Input label="Gross Monthly Income" type="number" min="0" placeholder="5000" value={income} onChange={e => setIncome(e.target.value)} hint="Pre-tax monthly income" />

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Monthly Debts</p>
          <div className="space-y-2">
            {debts.map((d, i) => (
              <div key={i} className="flex gap-2 items-end">
                <div className="flex-1">
                  <input className="input-field text-sm" placeholder="Label" value={d.label} onChange={e => updateDebt(i, 'label', e.target.value)} />
                </div>
                <div className="w-28">
                  <input className="input-field text-sm" type="number" min="0" placeholder="$0" value={d.payment} onChange={e => updateDebt(i, 'payment', e.target.value)} />
                </div>
                {i > 0 && (
                  <button onClick={() => removeDebt(i)} className="text-gray-400 hover:text-red-500 pb-2 text-sm">✕</button>
                )}
              </div>
            ))}
          </div>
          <button onClick={addDebt} className="text-sm text-primary-600 hover:text-primary-700 mt-2">+ Add debt</button>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <Button onClick={calculate} loading={loading} disabled={!income}>Calculate DTI</Button>

        {result && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl space-y-3">
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-bold ${dtiColor}`}>{result.dtiPercent}%</span>
              <span className="text-sm text-gray-500">DTI ratio</span>
              <span className={`text-sm font-semibold capitalize ${dtiColor}`}>{result.status}</span>
            </div>
            {result.exceedsThreshold && (
              <Alert variant="warning">
                DTI exceeds the 20% lender threshold. You would need to pay down
                <strong> ${result.paydownNeeded.toLocaleString()}/month</strong> to reach 20%.
              </Alert>
            )}
            <div className="space-y-1">
              {result.breakdown.map((d, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-600">{d.label}</span>
                  <span className="font-medium">${d.payment}/mo ({d.percent}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

// ─── Score Simulator ─────────────────────────────────────────────────────────
const ACTIONS_LIST = [
  { key: 'pay_collections',          label: 'Pay off collection accounts' },
  { key: 'remove_collection',        label: 'Remove collection from report' },
  { key: 'remove_charge_off',        label: 'Remove charge-off from report' },
  { key: 'pay_down_utilization_30',  label: 'Reduce utilization below 30%' },
  { key: 'pay_down_utilization_10',  label: 'Reduce utilization below 10%' },
  { key: 'remove_late_90_plus',      label: 'Remove 90+ day late payment' },
  { key: 'remove_late_30_60',        label: 'Remove 30-60 day late payment' },
  { key: 'remove_inquiry',           label: 'Remove unauthorized inquiry' },
  { key: 'remove_public_record',     label: 'Remove public record' },
  { key: 'remove_bankruptcy',        label: 'Remove bankruptcy (if errors)' },
  { key: 'add_positive_tradeline',   label: 'Add positive tradeline' },
  { key: 'authorized_user',          label: 'Become authorized user on good account' },
]

function ScoreSimulator() {
  const [score,    setScore]    = useState('')
  const [actions,  setActions]  = useState([])
  const [result,   setResult]   = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  function toggleAction(key) {
    setActions(a => a.includes(key) ? a.filter(x => x !== key) : [...a, key])
  }

  async function simulate() {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post('/tools/simulate', {
        currentScore: parseInt(score),
        actions,
      })
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Simulation failed')
    } finally { setLoading(false) }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Credit Score Improvement Simulator</CardTitle></CardHeader>
      <div className="space-y-4">
        <Input label="Current Score" type="number" min="300" max="850" placeholder="650" value={score} onChange={e => setScore(e.target.value)} />

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Select actions you plan to take</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ACTIONS_LIST.map(a => (
              <label key={a.key} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-sm transition-colors ${actions.includes(a.key) ? 'border-primary-400 bg-primary-50 text-primary-800' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}>
                <input type="checkbox" checked={actions.includes(a.key)} onChange={() => toggleAction(a.key)} className="rounded" />
                {a.label}
              </label>
            ))}
          </div>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <Button onClick={simulate} loading={loading} disabled={!score || actions.length === 0}>
          Simulate Impact
        </Button>

        {result && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Current</p>
                <p className="text-3xl font-bold text-gray-900">{result.currentScore}</p>
                <p className="text-xs capitalize text-gray-500">{result.currentCategory}</p>
              </div>
              <div className="text-3xl text-gray-300">→</div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Projected</p>
                <p className="text-3xl font-bold text-primary-700">{result.projectedMid}</p>
                <p className="text-xs capitalize text-primary-500">{result.projectedCategory}</p>
              </div>
            </div>

            <Alert variant="success">
              Estimated improvement: +{result.gainMin}–+{result.gainMax} points
            </Alert>

            <div className="space-y-2">
              {result.actions.map(a => (
                <div key={a.action} className="flex justify-between text-sm">
                  <span className="text-gray-600">{a.label}</span>
                  <span className="font-medium text-green-600">+{a.estimatedMin}–+{a.estimatedMax} pts</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-400">{result.disclaimer}</p>
          </div>
        )}
      </div>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tools</h1>
          <p className="text-sm text-gray-500 mt-1">Calculators based on documented FICO scoring factors</p>
        </div>
        <DTICalculator />
        <ScoreSimulator />
      </main>
    </div>
  )
}
