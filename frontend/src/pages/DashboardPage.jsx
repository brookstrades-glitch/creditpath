import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { format } from 'date-fns'
import Navbar from '../components/ui/Navbar'
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Alert from '../components/ui/Alert'
import ScoreBadge from '../components/ui/ScoreBadge'
import { BureauStatusRow } from '../components/ui/BureauPill'
import { useReport } from '../context/ReportContext'
import api from '../lib/api'

// ─── Credit Pull Form ─────────────────────────────────────────────────────────
function PullForm({ onPull, isPulling }) {
  const [fields, setFields] = useState({
    first_name: '', last_name: '', address: '',
    city: '', State: '', zip: '',
  })

  const set = (key) => (e) => setFields(f => ({ ...f, [key]: e.target.value }))

  function handleSubmit(e) {
    e.preventDefault()
    onPull({ ...fields, pullType: 'soft' })
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">First Name *</label>
        <input required className="input-field" value={fields.first_name} onChange={set('first_name')} />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Last Name *</label>
        <input required className="input-field" value={fields.last_name} onChange={set('last_name')} />
      </div>
      <div className="sm:col-span-2">
        <label className="text-xs font-medium text-gray-600 block mb-1">Street Address *</label>
        <input required className="input-field" value={fields.address} onChange={set('address')} />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">City *</label>
        <input required className="input-field" value={fields.city} onChange={set('city')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">State *</label>
          <input required maxLength={20} placeholder="e.g. Texas" className="input-field" value={fields.State} onChange={set('State')} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">ZIP *</label>
          <input required maxLength={5} pattern="\d{5}" className="input-field" value={fields.zip} onChange={set('zip')} />
        </div>
      </div>
      <div className="sm:col-span-2 pt-1">
        <Button type="submit" size="md" loading={isPulling} className="w-full sm:w-auto">
          Pull Tri-Bureau Report (Soft)
        </Button>
      </div>
    </form>
  )
}

// ─── Score card grid ──────────────────────────────────────────────────────────
function ScoreGrid({ report }) {
  const { scores, bureauStatuses } = report
  const bureaus = [
    { key: 'equifax',    label: 'Equifax',    score: scores?.equifax?.fico4,     model: 'FICO 4' },
    { key: 'experian',   label: 'Experian',   score: scores?.experian?.fico8,    model: 'FICO 8' },
    { key: 'transunion', label: 'TransUnion', score: scores?.transunion?.fico4,  model: 'FICO 4' },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {bureaus.map(b => (
        <Card key={b.key} className="flex flex-col items-center py-6">
          <ScoreBadge score={b.score} model={b.model} size="lg" />
          <p className="mt-3 text-sm font-semibold text-gray-700">{b.label}</p>
          <p className="text-xs text-gray-400 mt-0.5 capitalize">{bureauStatuses?.[b.key] || 'unknown'}</p>
        </Card>
      ))}
    </div>
  )
}

// ─── Summary stats ────────────────────────────────────────────────────────────
function SummaryStats({ report }) {
  const stats = [
    { label: 'Negative Marks',  value: report.negative_accounts?.length  ?? 0, color: 'text-red-600' },
    { label: 'Collections',     value: report.collections?.length         ?? 0, color: 'text-red-600' },
    { label: 'Inquiries',       value: report.inquiries?.length           ?? 0, color: 'text-orange-600' },
    { label: 'Public Records',  value: report.public_records?.length      ?? 0, color: 'text-orange-600' },
    { label: 'Trade Accounts',  value: report.trade_accounts?.length      ?? 0, color: 'text-green-600' },
  ]

  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
      {stats.map(s => (
        <Card key={s.label} className="text-center py-4">
          <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          <p className="text-xs text-gray-500 mt-1">{s.label}</p>
        </Card>
      ))}
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate  = useNavigate()
  const { user, isLoaded, isSignedIn } = useAuth()
  const { report, storeReport, setSnapshots, isPulling, setIsPulling, pullError, setPullError } = useReport()
  const [pullErrorMsg, setPullErrorMsg] = useState(null)
  const [snapshots, setLocalSnapshots] = useState([])
  const [backendError, setBackendError] = useState(null)

  // Redirect to consent if not yet consented.
  // Wait for Clerk to be fully loaded before calling the API —
  // window.Clerk.session.getToken() is not ready until isLoaded && isSignedIn.
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

    async function checkConsent() {
      try {
        const { data } = await api.get('/auth/me')
        if (!data.user.hasConsented) {
          navigate('/consent', { replace: true })
        }
      } catch (err) {
        const status = err.response?.status
        const code   = err.response?.data?.error?.code || err.code || 'NETWORK_ERROR'
        console.error('[checkConsent] /auth/me failed:', status, code, err.message)

        if (status === 401) {
          navigate('/sign-in', { replace: true })
        } else {
          setBackendError(`Server error (${status ?? 'network'}: ${code}). Please refresh.`)
        }
      }
    }
    checkConsent()
  }, [isLoaded, isSignedIn, navigate])

  // Load snapshots on mount
  useEffect(() => {
    api.get('/credit/snapshots')
      .then(({ data }) => {
        setLocalSnapshots(data.snapshots || [])
        setSnapshots(data.snapshots || [])
      })
      .catch(() => {})
  }, [setSnapshots])

  async function handlePull(fields) {
    setIsPulling(true)
    setPullErrorMsg(null)
    try {
      const { data } = await api.post('/credit/pull', fields)
      storeReport(data.report)
      // Refresh snapshots
      const snapshotRes = await api.get('/credit/snapshots')
      setLocalSnapshots(snapshotRes.data.snapshots || [])
      setSnapshots(snapshotRes.data.snapshots || [])
    } catch (err) {
      const msg = err.response?.data?.error?.message
      const code = err.response?.data?.error?.code
      if (code === 'COOLDOWN_ACTIVE') {
        const secs = err.response.data.error.retryAfter
        setPullErrorMsg(`Please wait ${Math.ceil(secs / 60)} minute(s) before pulling again.`)
      } else if (code === 'DAILY_LIMIT_REACHED') {
        setPullErrorMsg(`Daily pull limit reached. Resets tomorrow.`)
      } else if (code === 'VALIDATION_ERROR') {
        const details = err.response?.data?.error?.details?.fieldErrors
        const firstField = details ? Object.entries(details)[0] : null
        setPullErrorMsg(firstField
          ? `Invalid field "${firstField[0]}": ${firstField[1][0]}`
          : 'Please check all fields and try again.')
      } else {
        setPullErrorMsg(msg || 'Credit pull failed. Please try again.')
      }
    } finally {
      setIsPulling(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {backendError && (
          <Alert variant="error" title="Backend offline">
            {backendError}
          </Alert>
        )}

        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : user?.email ? `, ${user.email.split('@')[0]}` : ''}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {report
              ? `Report pulled · ${snapshots.length} pull${snapshots.length !== 1 ? 's' : ''} total`
              : 'Pull your tri-bureau credit report to get started'}
          </p>
        </div>

        {/* CROA required disclosure */}
        <Alert variant="legal">
          This application is not a Credit Repair Organization as defined in 15 U.S.C. § 1679a(3),
          does not provide legal advice, and does not act on behalf of third parties.
        </Alert>

        {/* Scores — only shown after pull */}
        {report && <ScoreGrid report={report} />}
        {report && <SummaryStats report={report} />}

        {/* Action plan CTA */}
        {report && report.actionPlan?.length > 0 && (
          <Alert variant="info" title={`${report.actionPlan.length} action items identified`}>
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm">Your prioritized action plan is ready.</span>
              <Link to="/action-plan">
                <Button size="sm" className="ml-4">View Action Plan →</Button>
              </Link>
            </div>
          </Alert>
        )}

        {/* Pull form */}
        <Card>
          <CardHeader>
            <CardTitle>Pull Credit Report</CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              Soft pull only · Does not affect your score · Max 3 per day
            </p>
          </CardHeader>
          {pullErrorMsg && (
            <Alert variant="error" className="mb-4">{pullErrorMsg}</Alert>
          )}
          <PullForm onPull={handlePull} isPulling={isPulling} />
        </Card>

        {/* Pull history */}
        {snapshots.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Pull History</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">EFX</th>
                    <th className="pb-2 font-medium">EXP</th>
                    <th className="pb-2 font-medium">TU</th>
                    <th className="pb-2 font-medium">Negatives</th>
                    <th className="pb-2 font-medium">Collections</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map(s => (
                    <tr key={s.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 text-gray-600">{format(new Date(s.pulledAt), 'MMM d, yyyy')}</td>
                      <td className="py-2 font-mono text-gray-900">{s.equifaxFico4 ?? '—'}</td>
                      <td className="py-2 font-mono text-gray-900">{s.experianFico8 ?? '—'}</td>
                      <td className="py-2 font-mono text-gray-900">{s.transunionFico4 ?? '—'}</td>
                      <td className="py-2 text-red-600">{s.negativeMarkCount}</td>
                      <td className="py-2 text-red-600">{s.collectionCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

      </main>
    </div>
  )
}
