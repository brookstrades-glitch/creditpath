import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import { useEffect } from 'react'
import { ReportProvider } from './context/ReportContext.jsx'

// Pages
import LandingPage       from './pages/LandingPage.jsx'
import SignInPage        from './pages/SignInPage.jsx'
import SignUpPage        from './pages/SignUpPage.jsx'
import AuthCallbackPage  from './pages/AuthCallbackPage.jsx'
import ConsentPage     from './pages/ConsentPage.jsx'
import DashboardPage   from './pages/DashboardPage.jsx'
import ActionPlanPage  from './pages/ActionPlanPage.jsx'
import DisputesPage    from './pages/DisputesPage.jsx'
import LettersPage     from './pages/LettersPage.jsx'
import NegotiationPage from './pages/NegotiationPage.jsx'
import ToolsPage       from './pages/ToolsPage.jsx'
import AccountPage     from './pages/AccountPage.jsx'

function ProtectedRoute({ children }) {
  const { isLoaded, isSignedIn } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate('/sign-in', { replace: true })
    }
  }, [isLoaded, isSignedIn, navigate])

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700" />
      </div>
    )
  }

  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <ReportProvider>
        <Routes>
          <Route path="/"        element={<LandingPage />} />
          <Route path="/sign-in"      element={<SignInPage />} />
          <Route path="/sign-up"      element={<SignUpPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          <Route path="/consent" element={<ProtectedRoute><ConsentPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/action-plan" element={<ProtectedRoute><ActionPlanPage /></ProtectedRoute>} />
          <Route path="/disputes" element={<ProtectedRoute><DisputesPage /></ProtectedRoute>} />
          <Route path="/letters" element={<ProtectedRoute><LettersPage /></ProtectedRoute>} />
          <Route path="/negotiate" element={<ProtectedRoute><NegotiationPage /></ProtectedRoute>} />
          <Route path="/tools" element={<ProtectedRoute><ToolsPage /></ProtectedRoute>} />
          <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ReportProvider>
    </BrowserRouter>
  )
}
