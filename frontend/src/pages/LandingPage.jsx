import { Link } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'
import Button from '../components/ui/Button'

const FEATURES = [
  {
    icon: '📊',
    title: 'Tri-Bureau Report',
    desc: 'Pull Equifax, Experian, and TransUnion simultaneously with a single soft inquiry.'
  },
  {
    icon: '🎯',
    title: 'Prioritized Action Plan',
    desc: 'See the highest-impact steps ranked by estimated score improvement — not a raw data dump.'
  },
  {
    icon: '📄',
    title: '14 FCRA Letter Templates',
    desc: 'Generate bureau dispute, furnisher dispute, goodwill, pay-for-delete, and FDCPA letters as PDFs.'
  },
  {
    icon: '⏱',
    title: 'FCRA Expiry Tracker',
    desc: 'Calculates when each negative item must be removed using the exact §605(c) 180-day formula.'
  },
  {
    icon: '📈',
    title: 'Score Delta View',
    desc: 'Compare every pull to see your progress. Scores and counts only — no PII stored.'
  },
  {
    icon: '🤝',
    title: 'Negotiation Suite',
    desc: 'Pay-for-delete, goodwill adjustment, and settlement workflows with letter tracking.'
  },
]

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth()

  // Redirect signed-in users to dashboard
  if (isLoaded && isSignedIn) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-700 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">CP</span>
            </div>
            <span className="font-semibold text-gray-900">CreditPath</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/sign-in">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/sign-up">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
          <span>⚖</span>
          <span>Personal use only · Not a Credit Repair Organization</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-4">
          Take control of your<br />
          <span className="text-primary-700">credit score</span>
        </h1>

        <p className="text-lg text-gray-500 max-w-xl mx-auto mb-8">
          CreditPath pulls your tri-bureau credit data, shows you exactly what to fix first,
          and generates every FCRA dispute letter you need — all free, all legal.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/sign-up">
            <Button size="lg">Start repairing your credit →</Button>
          </Link>
          <Link to="/sign-in">
            <Button variant="secondary" size="lg">Sign in</Button>
          </Link>
        </div>
      </section>

      {/* Features grid */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Legal footer */}
      <footer className="border-t border-gray-100 py-6">
        <p className="text-center text-xs text-gray-400 max-w-2xl mx-auto px-4">
          CreditPath is a personal-use tool only. It is not a Credit Repair Organization as defined in
          15 U.S.C. § 1679a(3), does not provide legal advice, and does not act on behalf of third parties.
          All dispute letters generated are for your personal review and submission only.
        </p>
      </footer>
    </div>
  )
}
