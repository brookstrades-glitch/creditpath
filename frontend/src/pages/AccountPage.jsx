import { useState, useEffect } from 'react'
import { useUser, useClerk } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import Navbar from '../components/ui/Navbar'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Alert from '../components/ui/Alert'
import api from '../lib/api'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC'
]

export default function AccountPage() {
  const { user: clerkUser } = useUser()
  const { signOut }         = useClerk()
  const navigate            = useNavigate()

  const [account,    setAccount]    = useState(null)
  const [state,      setState]      = useState('')
  const [saving,     setSaving]     = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [saveMsg,    setSaveMsg]    = useState(null)
  const [error,      setError]      = useState(null)

  useEffect(() => {
    api.get('/account')
      .then(({ data }) => {
        setAccount(data.user)
        setState(data.user.state || 'TX')
      })
      .catch(() => {})
  }, [])

  async function handleSaveState() {
    setSaving(true)
    setSaveMsg(null)
    try {
      const { data } = await api.patch('/account', { state })
      setAccount(a => ({ ...a, state: data.user.state }))
      setSaveMsg('State updated.')
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update')
    } finally { setSaving(false) }
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    try {
      await api.delete('/account')
      await signOut()
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to delete account')
      setDeleting(false)
      setConfirmDel(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">

        <h1 className="text-2xl font-bold text-gray-900">Account</h1>

        {/* Profile */}
        <Card>
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Email</span>
              <span className="text-gray-900">{clerkUser?.primaryEmailAddress?.emailAddress}</span>
            </div>
            {account?.createdAt && (
              <div className="flex justify-between">
                <span className="text-gray-500">Member since</span>
                <span className="text-gray-900">{format(new Date(account.createdAt), 'MMMM d, yyyy')}</span>
              </div>
            )}
            {account?.hasConsented && account?.fcraConsentAt && (
              <div className="flex justify-between">
                <span className="text-gray-500">FCRA Consent</span>
                <span className="text-green-600 font-medium">
                  ✓ {format(new Date(account.fcraConsentAt), 'MMM d, yyyy')}
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Activity */}
        {account?._count && (
          <Card>
            <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Credit Pulls',   value: account._count.pullSnapshots },
                { label: 'Disputes',       value: account._count.disputes },
                { label: 'Letters',        value: account._count.letters },
                { label: 'Negotiations',   value: account._count.negotiations },
              ].map(s => (
                <div key={s.label} className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* State */}
        <Card>
          <CardHeader>
            <CardTitle>State</CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">Determines which state-level consumer protection laws apply to you</p>
          </CardHeader>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <select
                value={state}
                onChange={e => setState(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <Button size="sm" onClick={handleSaveState} loading={saving}>Save</Button>
          </div>
          {saveMsg && <p className="text-xs text-green-600 mt-2">{saveMsg}</p>}
        </Card>

        {error && <Alert variant="error">{error}</Alert>}

        {/* Delete account */}
        <Card className="border-red-100">
          <CardHeader><CardTitle className="text-red-700">Delete Account</CardTitle></CardHeader>
          <p className="text-sm text-gray-500 mb-4">
            Permanently deletes your account and all associated data — disputes, letters,
            negotiations, and pull snapshots. This cannot be undone.
          </p>

          {!confirmDel ? (
            <Button variant="danger" onClick={() => setConfirmDel(true)}>Delete My Account</Button>
          ) : (
            <div className="space-y-3">
              <Alert variant="error" title="This is permanent">
                All your data will be deleted immediately. Are you sure?
              </Alert>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setConfirmDel(false)}>Cancel</Button>
                <Button variant="danger" loading={deleting} onClick={handleDeleteAccount}>
                  Yes, delete permanently
                </Button>
              </div>
            </div>
          )}
        </Card>
      </main>
    </div>
  )
}
