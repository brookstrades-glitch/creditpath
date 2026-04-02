import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { ReportProvider } from './context/ReportContext.jsx'

// Pages
import LandingPage from './pages/LandingPage.jsx'
import SignInPage from './pages/SignInPage.jsx'
import SignUpPage from './pages/SignUpPage.jsx'
import ConsentPage from './pages/ConsentPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import ActionPlanPage from './pages/ActionPlanPage.jsx'
import DisputesPage from './pages/DisputesPage.jsx'
import LettersPage from './pages/LettersPage.jsx'
import NegotiationPage from './pages/NegotiationPage.jsx'
import ToolsPage from './pages/ToolsPage.jsx'
import AccountPage from './pages/AccountPage.jsx'

// Route guard — redirects unauthenticated users to sign-in
function ProtectedRoute({ children }) {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700" />
      </div>
    )
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />
  }

  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <ReportProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />

          {/* FCRA consent — required before first pull, protected */}
          <Route
            path="/consent"
            element={
              <ProtectedRoute>
                <ConsentPage />
              </ProtectedRoute>
            }
          />

          {/* Protected app routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/action-plan"
            element={
              <ProtectedRoute>
                <ActionPlanPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/disputes"
            element={
              <ProtectedRoute>
                <DisputesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/letters"
            element={
              <ProtectedRoute>
                <LettersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/negotiate"
            element={
              <ProtectedRoute>
                <NegotiationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tools"
            element={
              <ProtectedRoute>
                <ToolsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <AccountPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all — redirect unknown routes to dashboard if signed in */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ReportProvider>
    </BrowserRouter>
  )
}
