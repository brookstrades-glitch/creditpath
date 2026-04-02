/**
 * ReportContext — Stateless credit data store
 *
 * DESIGN DECISION (PRD §1.3):
 * Raw credit report data (full_feed) is NEVER written to the database.
 * It lives in React state for the browser session only.
 * This eliminates FCRA §628 data disposal obligations entirely.
 *
 * When the user closes the tab or the session expires, the data is gone.
 * Users re-pull to refresh — acceptable behavior for a credit app.
 */
import { createContext, useContext, useState, useCallback } from 'react'

const ReportContext = createContext(null)

export function ReportProvider({ children }) {
  // The processed report returned by POST /api/credit/pull
  const [report, setReport] = useState(null)

  // All pull snapshots for delta view (scores + counts only — no PII)
  const [snapshots, setSnapshots] = useState([])

  // Loading and error state for the pull request
  const [isPulling, setIsPulling] = useState(false)
  const [pullError, setPullError] = useState(null)

  // Store a new report after a successful pull
  const storeReport = useCallback((processedReport) => {
    setReport(processedReport)
    setPullError(null)
  }, [])

  // Clear report from state (e.g., on logout)
  const clearReport = useCallback(() => {
    setReport(null)
    setPullError(null)
  }, [])

  const value = {
    report,
    snapshots,
    setSnapshots,
    isPulling,
    setIsPulling,
    pullError,
    setPullError,
    storeReport,
    clearReport,
  }

  return (
    <ReportContext.Provider value={value}>
      {children}
    </ReportContext.Provider>
  )
}

// Hook — throws if used outside provider
export function useReport() {
  const ctx = useContext(ReportContext)
  if (!ctx) {
    throw new Error('useReport must be used within a ReportProvider')
  }
  return ctx
}
