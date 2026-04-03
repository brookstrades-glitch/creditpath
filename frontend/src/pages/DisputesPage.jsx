import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { format, differenceInDays, addDays } from 'date-fns'
import Navbar from '../components/ui/Navbar'
import { Card } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Alert from '../components/ui/Alert'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import api from '../lib/api'

// FCRA §611 timeline urgency — days since submittedAt
function getUrgency(dispute) {
  if (!dispute.submittedAt) return null
  const submitted = new Date(dispute.submittedAt)
  const deadline  = addDays(submitted, 30)
  const today     = new Date()
  const daysLeft  = differenceInDays(deadline, today)

  if (daysLeft < 0)  return { label: `${Math.abs(daysLeft)}d overdue`, color: 'red',    textColor: 'text-red-700',    bg: 'bg-red-50' }
  if (daysLeft <= 2) return { label: `${daysLeft}d left`,              color: 'red',    textColor: 'text-red-700',    bg: 'bg-red-50' }
  if (daysLeft <= 7) return { label: `${daysLeft}d left`,              color: 'orange', textColor: 'text-orange-700', bg: 'bg-orange-50' }
  return               { label: `${daysLeft}d left`,              color: 'green',  textColor: 'text-green-700', bg: 'bg-green-50' }
}

const STATUS_BADGE = {
  pending:                 'gray',
  submitted:               'blue',
  in_reinvestigation:      'purple',
  resolved_favorable:      'green',
  resolved_unfavorable:    'red',
  escalated:               'red',
  statement_added:         'yellow',
}

const STATUS_LABEL = {
  pending:              'Pending',
  submitted:            'Submitted',
  in_reinvestigation:   'In Reinvestigation',
  resolved_favorable:   'Resolved ✓',
  resolved_unfavorable: 'Resolved ✗',
  escalated:            'Escalated',
  statement_added:      'Statement Added',
}

// ─── New Dispute Modal ─────────────────────────────────────────────────────────
function NewDisputeModal({ onClose, onCreated }) {
  const [fields, setFields] = useState({
    bureau: 'equifax', disputePath: 'bureau',
    itemDescription: '', submittedAt: '',
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const set = (k) => (e) => setFields(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post('/disputes', {
        ...fields,
        submittedAt: fields.submittedAt ? new Date(fields.submittedAt).toISOString() : null,
      })
      onCreated(data.dispute)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create dispute')
      setLoading(false)
    }
  }

  return (
    <Modal isOpen title="Open New Dispute" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Bureau / Target *</label>
          <select className="input-field" value={fields.bureau} onChange={set('bureau')} required>
            <option value="equifax">Equifax</option>
            <option value="experian">Experian</option>
            <option value="transunion">TransUnion</option>
            <option value="furnisher">Direct to Furnisher</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Dispute Path *</label>
          <select className="input-field" value={fields.disputePath} onChange={set('disputePath')} required>
            <option value="bureau">Bureau (§611)</option>
            <option value="furnisher">Furnisher (§623)</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Item Description *</label>
          <textarea rows={3} required className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-600 focus:outline-none" value={fields.itemDescription} onChange={set('itemDescription')} placeholder="Describe the specific item being disputed" />
        </div>
        <Input
          label="Date Bureau Received Letter (starts 30-day clock)"
          type="date"
          value={fields.submittedAt}
          onChange={set('submittedAt')}
          hint="Leave blank until you have certified mail tracking confirmation"
        />
        <Alert variant="legal" className="text-xs">
          The 30-day FCRA §611 clock starts when the bureau <strong>receives</strong> your dispute
          — not when you mail it. Use certified mail tracking to confirm delivery date.
        </Alert>
        {error && <Alert variant="error">{error}</Alert>}
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Open Dispute</Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Dispute card ─────────────────────────────────────────────────────────────
function DisputeCard({ dispute, onUpdate }) {
  const urgency = getUrgency(dispute)
  const [updating, setUpdating] = useState(false)

  async function updateStatus(status) {
    setUpdating(true)
    try {
      const { data } = await api.patch(`/disputes/${dispute.id}`, { status })
      onUpdate(data.dispute)
    } catch {} finally { setUpdating(false) }
  }

  return (
    <Card className={urgency ? `border-l-4 border-l-${urgency.color}-400` : ''}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant={STATUS_BADGE[dispute.status] || 'gray'}>
              {STATUS_LABEL[dispute.status] || dispute.status}
            </Badge>
            <Badge variant="blue" className="capitalize">{dispute.bureau}</Badge>
            <Badge variant="purple">{dispute.disputePath === 'bureau' ? '§611' : '§623'}</Badge>
            {urgency && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${urgency.bg} ${urgency.textColor}`}>
                {urgency.label}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-800">{dispute.itemDescription}</p>
          <p className="text-xs text-gray-400 mt-1">
            Opened {format(new Date(dispute.createdAt), 'MMM d, yyyy')}
            {dispute.submittedAt && ` · Submitted ${format(new Date(dispute.submittedAt), 'MMM d, yyyy')}`}
          </p>
        </div>
      </div>

      {/* Status update */}
      {!['resolved_favorable','resolved_unfavorable'].includes(dispute.status) && (
        <div className="mt-4 flex gap-2 flex-wrap">
          {dispute.status === 'pending' && (
            <Button size="sm" variant="secondary" onClick={() => updateStatus('submitted')} loading={updating}>
              Mark Submitted
            </Button>
          )}
          {dispute.status === 'submitted' && (
            <Button size="sm" variant="secondary" onClick={() => updateStatus('in_reinvestigation')} loading={updating}>
              Bureau Acknowledged
            </Button>
          )}
          {dispute.status === 'in_reinvestigation' && (
            <>
              <Button size="sm" variant="secondary" onClick={() => updateStatus('resolved_favorable')} loading={updating}>
                Resolved ✓
              </Button>
              <Button size="sm" variant="ghost" onClick={() => updateStatus('resolved_unfavorable')} loading={updating}>
                Denied ✗
              </Button>
              <Button size="sm" variant="danger" onClick={() => updateStatus('escalated')} loading={updating}>
                Escalate
              </Button>
            </>
          )}
          {dispute.status === 'resolved_unfavorable' && (
            <Link to={`/letters?letter=2&path=bureau`}>
              <Button size="sm" variant="secondary">Generate Escalation Letter →</Button>
            </Link>
          )}
          {dispute.status === 'escalated' && (
            <Link to={`/letters?letter=10&path=furnisher`}>
              <Button size="sm" variant="danger">Generate Furnisher Escalation →</Button>
            </Link>
          )}
        </div>
      )}
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DisputesPage() {
  const [disputes,  setDisputes]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showNew,   setShowNew]   = useState(false)

  useEffect(() => {
    api.get('/disputes')
      .then(({ data }) => setDisputes(data.disputes || []))
      .finally(() => setLoading(false))
  }, [])

  function handleCreated(dispute) {
    setDisputes(d => [dispute, ...d])
  }

  function handleUpdate(updated) {
    setDisputes(d => d.map(x => x.id === updated.id ? updated : x))
  }

  const active   = disputes.filter(d => !['resolved_favorable','resolved_unfavorable'].includes(d.status))
  const resolved = disputes.filter(d =>  ['resolved_favorable','resolved_unfavorable'].includes(d.status))

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-5">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Disputes</h1>
            <p className="text-sm text-gray-500 mt-1">Track FCRA §611 and §623 dispute timelines</p>
          </div>
          <Button onClick={() => setShowNew(true)}>+ New Dispute</Button>
        </div>

        <Alert variant="legal">
          The 30-day FCRA §611 reinvestigation clock starts when the bureau <strong>receives</strong>
          your letter — not when you send it. Always use USPS Certified Mail with tracking.
          This application is not a Credit Repair Organization.
        </Alert>

        {loading && <p className="text-sm text-gray-400">Loading...</p>}

        {!loading && active.length === 0 && resolved.length === 0 && (
          <Card>
            <p className="text-sm text-gray-500 text-center py-4">
              No disputes yet. Open a dispute to start tracking your 30-day FCRA timeline.
            </p>
          </Card>
        )}

        {active.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">Active ({active.length})</h2>
            {active.map(d => <DisputeCard key={d.id} dispute={d} onUpdate={handleUpdate} />)}
          </div>
        )}

        {resolved.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-400">Resolved ({resolved.length})</h2>
            {resolved.map(d => <DisputeCard key={d.id} dispute={d} onUpdate={handleUpdate} />)}
          </div>
        )}
      </main>

      {showNew && (
        <NewDisputeModal onClose={() => setShowNew(false)} onCreated={handleCreated} />
      )}
    </div>
  )
}
