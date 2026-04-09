import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://creditpath-production.up.railway.app'

export default function SignUpPage() {
  const { signUp } = useAuth()
  const navigate   = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState(null)
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      await signUp(email, password)
      navigate('/consent', { replace: true })
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Sign up failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="w-12 h-12 bg-primary-700 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-lg">CP</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-sm text-gray-500 mt-1">Start understanding your credit today</p>
        </div>

        {/* Form */}
        <div className="bg-white shadow-sm border border-gray-100 rounded-2xl p-8">

          {/* Microsoft OAuth */}
          <a
            href={`${API_BASE}/api/auth/microsoft`}
            className="flex items-center justify-center gap-3 w-full border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors mb-5"
          >
            <svg width="18" height="18" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
              <rect x="1"  y="1"  width="9" height="9" fill="#F25022"/>
              <rect x="11" y="1"  width="9" height="9" fill="#7FBA00"/>
              <rect x="1"  y="11" width="9" height="9" fill="#00A4EF"/>
              <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
            </svg>
            Continue with Microsoft
          </a>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400">or sign up with email</span></div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Min. 8 characters"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-700 hover:bg-primary-800 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/sign-in" className="text-primary-700 hover:underline font-medium">Sign in</Link>
          </p>
        </div>

        <p className="mt-6 text-xs text-gray-400 text-center max-w-xs mx-auto">
          This application is not a Credit Repair Organization as defined in 15 U.S.C. § 1679a(3)
          and does not provide legal advice.
        </p>
      </div>
    </div>
  )
}
