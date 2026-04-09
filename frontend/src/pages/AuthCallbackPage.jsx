import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

const ERROR_MESSAGES = {
  microsoft_denied: 'Microsoft sign-in was cancelled.',
  invalid_state:    'Security check failed. Please try again.',
  no_email:         'Could not retrieve your email from Microsoft. Please use email/password sign-in.',
  oauth_failed:     'Microsoft sign-in failed. Please try again.',
}

/**
 * Landing page after Microsoft OAuth redirect.
 * Backend sends:  /auth/callback?token=<jwt>&dest=dashboard|consent
 * We store the token in localStorage then do a full navigation so
 * AuthContext re-initialises with the new token.
 */
export default function AuthCallbackPage() {
  const [params] = useSearchParams()

  useEffect(() => {
    const token = params.get('token')
    const dest  = params.get('dest') || 'consent'
    const error = params.get('error')

    if (error) {
      const msg = ERROR_MESSAGES[error] || 'Sign-in failed.'
      window.location.replace(`/sign-in?msg=${encodeURIComponent(msg)}`)
      return
    }

    if (!token) {
      window.location.replace('/sign-in')
      return
    }

    // Store token — AuthContext will pick it up on next load
    localStorage.setItem('cp_token', token)

    // Full page navigation so AuthContext useEffect re-runs
    window.location.replace(`/${dest}`)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700" />
      <p className="text-sm text-gray-500">Signing you in…</p>
    </div>
  )
}
