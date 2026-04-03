import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/ui/Navbar'
import { Card } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Alert from '../components/ui/Alert'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import api from '../lib/api'

const STRATEGY_INFO = {
  pay_for_delete: {
    label:   'Pay-for-Delete',
    badge:   'green',
    desc:    'Pay in exchange for complete removal of the tradeline',
    letters: [{ n: 14, label: 'Step 1: FDCPA Validation (Letter 14)' }, { n: 12, label: 'Step 2: Pay-for-Delete Offer (Letter 12)' }],
  },
  goodwill: {
    label:   'Goodwill Adjustment',
    badge:   'blue',
    desc:    'Request removal as a gesture of goodwill for an isolated late payment',
    letters: [{ n: 11, label: 'Goodwill Letter (Letter 11)' }],
  },
  settlement: {
    label:   'Settlement',
    badge:   'yellow',
    desc:    'Negotiate a lump-sum payoff for less than the full balance',
    letters: [{ n: 14, label: 'Step 1: FDCPA Validation (Letter 14)' }, { n: 13, label: 'Step 2: Settlement Offer (Letter 13)' }],
  },
}

const PHASE_STEPS = ['validation', 'negotiation', 'verification']
const PHASE_LABEL = { validation: 'Validation', negotiation: 'Negotiation', verification: 'Verification' }

function PhaseProgress({ phase }) {
  const current = PHASE_STEPS.indexOf(phase)
  return (
    <div className="flex items-center gap-1">
      {PHASE_STEPS.map((p, i) => (
        <div key={p} className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${i <= current ? 'bg-primary-600' : 'bg-gray-200'}`} />
          <span className={`text-xs ${i === current ? 'text-primary-700 font-semibold' : 'text-gray-400'}`}>
            {PHASE_LABEL[p]}
          </span>
          {i < PHASE_STEPS.length - 1 && <span className="text-gray-200 mx-0.5">›</span>}
        </div>
      ))}
    </div>
  )
}

// ─── New Negotiation Modal ─────────────────────────────────────────────────────
function NewNegotiationModal({ onClose, onCreated }) {
  const [fields, setFields] = useState({ creditorName: '', accountDescription: '', strategy: 'pay_for_delete' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const set = (k) => (e) => setFields(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post('/negotiate', fields)
      onCreated(data.negotiation)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to start negotiation')
      setLoading(false)
    }
  }

  return (
    <Modal isOpen title="Start Negotiation Track" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Creditor / Collection Agency" required value={fields.creditorName} onChange={set('creditorName')} />
        <Input label="Account Description" required placeholder="e.g. Capital One Visa ending 4321 — $2,400" value={fields.accountDescription} onChange={set('accountDescription')} />
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">Strategy *</label>
          <div className="space-y-2">
            {Object.entries(STRATEGY_INFO).map(([key, info]) => (
              <label key={key} className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${fields.strategy === key ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" name="strategy" value={key} checked={fields.strategy === key} onChange={set('strategy')} className="mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{info.label}</p>
                  <p className="text-xs text-gray-500">{info.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
        {error && <Alert variant="error">{error}</Alert>}
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Start Track</Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Negotiation card ─────────────────────────────────────────────────────────
function NegotiationCard({ negotiation: neg, onUpdate }) {
  const info = STRATEGY_INFO[neg.strategy]
  const [advancing, setAdvancing] = useState(false)

  async function advancePhase() {
    const next = { validation: 'negotiation', negotiation: 'verification' }[neg.phase]
    if (!next) return
    setAdvancing(true)
    try {
      const { data } = await api.patch(`/negotiate/${neg.id}`, { phase: next })
      onUpdate(data.negotiation)
    } catch {} finally { setAdvancing(false) }
  }

  async function markDeletionVerified() {
    setAdvancing(true)
    try {
      const { data } = await api.patch(`/negotiate/${neg.id}`, { deletionVerified: true })
      onUpdate(data.negotiation)
    } catch {} finally { setAdvancing(false) }
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant={info?.badge || 'gray'}>{info?.label || neg.strategy}</Badge>
            {neg.deletionVerified && <Badge variant="green">✓ Deletion Verified</Badge>}
          </div>
          <h3 className="font-semibold text-gray-900 text-sm">{neg.creditorName}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{neg.accountDescription}</p>
          <div className="mt-2">
            <PhaseProgress phase={neg.phase} />
          </div>
        </div>
      </div>

      {/* Recommended letters for this strategy */}
      {info?.letters && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">Recommended Letters</p>
          <div className="flex flex-wrap gap-2">
            {info.letters.map(l => (
              <Link key={l.n} to={`/letters?letter=${l.n}&path=collector`}>
                <Button size="sm" variant="secondary">{l.label} →</Button>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Phase actions */}
      <div className="mt-4 flex gap-2 flex-wrap">
        {neg.phase !== 'verification' && (
          <Button size="sm" variant="secondary" loading={advancing} onClick={advancePhase}>
            Advance to {PHASE_LABEL[{ validation: 'negotiation', negotiation: 'verification' }[neg.phase]]} →
          </Button>
        )}
        {neg.phase === 'verification' && !neg.deletionVerified && (
          <Button size="sm" variant="primary" loading={advancing} onClick={markDeletionVerified}>
            ✓ Confirm Deletion on Report
          </Button>
        )}
      </div>

      {neg.agreedTerms && (
        <div className="mt-3 p-3 bg-green-50 rounded-lg">
          <p className="text-xs font-semibold text-green-700 mb-0.5">Agreed Terms</p>
          <p className="text-sm text-green-800">{neg.agreedTerms}</p>
        </div>
      )}
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function NegotiationPage() {
  const [negotiations, setNegotiations] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showNew,  setShowNew]  = useState(false)

  useEffect(() => {
    api.get('/negotiate')
      .then(({ data }) => setNegotiations(data.negotiations || []))
      .finally(() => setLoading(false))
  }, [])

  function handleCreated(n) { setNegotiations(prev => [n, ...prev]) }
  function handleUpdate(updated) { setNegotiations(prev => prev.map(x => x.id === updated.id ? updated : x)) }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Negotiation Tracker</h1>
            <p className="text-sm text-gray-500 mt-1">Pay-for-delete · Goodwill · Settlement</p>
          </div>
          <Button onClick={() => setShowNew(true)}>+ New Track</Button>
        </div>

        <Alert variant="legal">
          Always send FDCPA §1692g debt validation first before making any payment to a collector.
          Paying without validating may restart the statute of limitations.
          This application does not act on your behalf.
        </Alert>

        {loading && <p className="text-sm text-gray-400">Loading...</p>}

        {!loading && negotiations.length === 0 && (
          <Card>
            <p className="text-sm text-gray-500 text-center py-4">
              No negotiation tracks yet. Start one from the Action Plan or the button above.
            </p>
          </Card>
        )}

        {negotiations.map(n => (
          <NegotiationCard key={n.id} negotiation={n} onUpdate={handleUpdate} />
        ))}
      </main>

      {showNew && (
        <NewNegotiationModal onClose={() => setShowNew(false)} onCreated={handleCreated} />
      )}
    </div>
  )
}
