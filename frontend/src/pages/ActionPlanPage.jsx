import { Link } from 'react-router-dom'
import Navbar from '../components/ui/Navbar'
import { Card } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Alert from '../components/ui/Alert'
import { BureauStatusRow } from '../components/ui/BureauPill'
import { useReport } from '../context/ReportContext'

const PRIORITY_BADGE = {
  critical: { variant: 'red',    label: 'Critical' },
  high:     { variant: 'orange', label: 'High' },
  medium:   { variant: 'yellow', label: 'Medium' },
  low:      { variant: 'gray',   label: 'Low' },
}

const TRAFFIC_LIGHT = {
  red:     'bg-red-500',
  amber:   'bg-amber-400',
  green:   'bg-green-500',
  none:    'bg-gray-300',
  unknown: 'bg-gray-200',
}

function FcraExpiryBar({ fcra }) {
  if (!fcra) return null
  const { trafficLight, daysRemaining, expiryDate, isExpired } = fcra

  return (
    <div className="flex items-center gap-2 mt-2">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${TRAFFIC_LIGHT[trafficLight] || 'bg-gray-300'}`} />
      <span className="text-xs text-gray-500">
        {isExpired
          ? '⚡ FCRA expiry exceeded — dispute for removal now'
          : daysRemaining !== null
            ? `FCRA expires in ${daysRemaining} days (${new Date(expiryDate).getFullYear()})`
            : 'FCRA expiry unknown'
        }
      </span>
    </div>
  )
}

function ActionItem({ item, rank }) {
  const badge = PRIORITY_BADGE[item.priority] || PRIORITY_BADGE.low
  const bureauStatuses = {}
  ;(item.bureaus || []).forEach(b => { bureauStatuses[b] = 'success' })

  return (
    <Card className="border-l-4 border-l-primary-600">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
              #{rank}
            </span>
            <Badge variant={badge.variant}>{badge.label}</Badge>
            <BureauStatusRow statuses={bureauStatuses} />
          </div>
          <h3 className="font-semibold text-gray-900 text-sm">{item.title}</h3>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.description}</p>
          <FcraExpiryBar fcra={item.fcra} />
        </div>
        {item.amount > 0 && (
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-bold text-gray-900">${item.amount?.toLocaleString()}</p>
            <p className="text-xs text-gray-400">balance</p>
          </div>
        )}
      </div>

      {/* Recommended actions */}
      {item.actions?.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Recommended Actions
          </p>
          <ol className="space-y-1.5">
            {item.actions.filter(Boolean).map((action, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs flex items-center justify-center font-semibold mt-0.5">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <span className="text-gray-700">{action.label}</span>
                  {action.letter && (
                    <Link
                      to={`/letters?letter=${action.letter}&path=${action.path}`}
                      className="ml-2 text-xs text-primary-600 hover:text-primary-700 font-medium"
                    >
                      → Generate Letter {action.letter}
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Card>
  )
}

export default function ActionPlanPage() {
  const { report } = useReport()

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-gray-500 mb-4">No report loaded. Pull your credit report first.</p>
          <Link to="/dashboard">
            <Button>Go to Dashboard →</Button>
          </Link>
        </main>
      </div>
    )
  }

  const actionPlan = report.actionPlan || []

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-5">

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Action Plan</h1>
          <p className="text-sm text-gray-500 mt-1">
            {actionPlan.length} item{actionPlan.length !== 1 ? 's' : ''} ranked by estimated impact
          </p>
        </div>

        <Alert variant="legal">
          This application is not a Credit Repair Organization as defined in 15 U.S.C. § 1679a(3),
          does not provide legal advice, and does not act on behalf of third parties.
        </Alert>

        {actionPlan.length === 0 ? (
          <Card>
            <p className="text-gray-500 text-sm text-center py-4">
              No negative items found in your report. Your credit looks clean!
            </p>
          </Card>
        ) : (
          actionPlan.map((item, i) => (
            <ActionItem key={i} item={item} rank={i + 1} />
          ))
        )}
      </main>
    </div>
  )
}
