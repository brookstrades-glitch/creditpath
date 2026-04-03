import { Link, useLocation } from 'react-router-dom'
import { useAuth, UserButton } from '@clerk/clerk-react'
import { clsx } from 'clsx'

const NAV_ITEMS = [
  { to: '/dashboard',   label: 'Dashboard' },
  { to: '/action-plan', label: 'Action Plan' },
  { to: '/disputes',    label: 'Disputes' },
  { to: '/letters',     label: 'Letters' },
  { to: '/negotiate',   label: 'Negotiate' },
  { to: '/tools',       label: 'Tools' },
]

export default function Navbar() {
  const { pathname } = useLocation()
  const { isSignedIn } = useAuth()

  if (!isSignedIn) return null

  return (
    <nav className="bg-primary-900 border-b border-primary-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">CP</span>
            </div>
            <span className="text-white font-semibold text-sm tracking-wide">CreditPath</span>
          </Link>

          {/* Nav links — hidden on mobile */}
          <div className="hidden md:flex items-center gap-0.5">
            {NAV_ITEMS.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className={clsx(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  pathname.startsWith(item.to)
                    ? 'bg-primary-700 text-white'
                    : 'text-primary-200 hover:text-white hover:bg-primary-800'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* User button */}
          <div className="flex items-center">
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: 'w-8 h-8',
                }
              }}
            />
          </div>
        </div>
      </div>
    </nav>
  )
}
