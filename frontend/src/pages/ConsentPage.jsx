import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Card } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Alert from '../components/ui/Alert'
import Input from '../components/ui/Input'
import api from '../lib/api'

// Full FCRA §604(a)(2) consent text — stored verbatim with timestamp in DB
function buildConsentText(fullName) {
  return `I, ${fullName}, authorize CreditPath to facilitate access to my consumer credit report for my personal review. I understand this is a soft inquiry and will not appear on my credit report as a hard inquiry. I understand CreditPath is not a Credit Repair Organization as defined in 15 U.S.C. § 1679a(3), does not provide legal advice, and does not act on behalf of third parties. I am requesting access to my own credit report pursuant to my rights under the Fair Credit Reporting Act, 15 U.S.C. § 1681 et seq.`
}

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC'
]

// States with additional FCRA-plus rights — show extra notice per PRD §3.6
const ENHANCED_STATES = {
  CA: 'California consumers have additional rights under Civil Code § 1785 et seq., including the right to know the source of adverse information.',
  CO: 'Colorado consumers have additional rights under C.R.S. § 12-14.3 et seq.',
  MA: 'Massachusetts consumers have additional rights under M.G.L. c. 93, § 50 et seq.',
  VT: 'Vermont consumers have additional rights under 9 V.S.A. § 2480e et seq.',
  NJ: 'New Jersey consumers have additional rights under N.J.S.A. § 56:11-28 et seq.',
}

export default function ConsentPage() {
  const navigate   = useNavigate()
  const { user } = useAuth()

  const [fullName,  setFullName]  = useState('')
  const [state,     setState]     = useState('TX') // Default from PRD §3.6
  const [checked,   setChecked]   = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)

  const consentText    = buildConsentText(fullName || '[Your Name]')
  const enhancedNotice = ENHANCED_STATES[state]

  async function handleSubmit(e) {
    e.preventDefault()
    if (!checked || !fullName.trim()) return

    setLoading(true)
    setError(null)

    try {
      // Store consent with exact text + timestamp
      await api.post('/auth/consent', {
        consentText: buildConsentText(fullName.trim()),
        state,
        name: fullName.trim(),
      })

      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to record consent. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-primary-700 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-lg">CP</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Authorize Credit Access</h1>
          <p className="text-sm text-gray-500 mt-1">
            Required by law before your first credit pull
          </p>
        </div>

        {/* Legal alert */}
        <Alert variant="legal" title="FCRA § 604(a)(2) Consent Required" className="mb-6">
          Before CreditPath can access your credit report, federal law requires your explicit
          written authorization. This is a soft pull — it will <strong>not</strong> appear
          on your credit report or affect your score.
        </Alert>

        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {/* Full name */}
            <Input
              label="Your Full Legal Name"
              required
              placeholder="As it appears on your credit file"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              hint="Used to personalize your consent authorization"
            />

            {/* State */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Your State <span className="text-red-500">*</span>
              </label>
              <select
                value={state}
                onChange={e => setState(e.target.value)}
                required
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-600"
              >
                {US_STATES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500">Used to determine applicable state consumer protection laws</p>
            </div>

            {/* Enhanced state notice */}
            {enhancedNotice && (
              <Alert variant="info" title="Additional State Rights">
                {enhancedNotice}
              </Alert>
            )}

            {/* Consent text */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Authorization Text</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 leading-relaxed font-mono">
                {consentText}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                This exact text and a UTC timestamp will be stored per FCRA § 604(a)(2).
              </p>
            </div>

            {/* CROA disclosure — PRD §3.3 */}
            <Alert variant="warning" title="Required Disclosure">
              This application is <strong>not</strong> a Credit Repair Organization as defined
              in 15 U.S.C. § 1679a(3), does not provide legal advice, and does not act on
              behalf of third parties. All letters generated are for your personal review
              and submission only.
            </Alert>

            {/* Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={checked}
                onChange={e => setChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-600"
              />
              <span className="text-sm text-gray-700">
                I, <strong>{fullName || '[your name]'}</strong>, have read and agree to the
                authorization text above. I am the consumer identified in this request and I
                am authorizing access to my own credit report for my personal use.
              </span>
            </label>

            {error && <Alert variant="error">{error}</Alert>}

            <Button
              type="submit"
              size="lg"
              disabled={!checked || !fullName.trim()}
              loading={loading}
              className="w-full"
            >
              Authorize &amp; Continue
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
