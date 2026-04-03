import { clsx } from 'clsx'

/**
 * Alert — inline notification banner
 * Variants: info | success | warning | error | legal
 * "legal" variant is used for FCRA/CROA required disclosures
 */
export default function Alert({ children, variant = 'info', title, className }) {
  const variants = {
    info:    { wrap: 'bg-blue-50 border-blue-200 text-blue-800',   icon: 'ℹ' },
    success: { wrap: 'bg-green-50 border-green-200 text-green-800', icon: '✓' },
    warning: { wrap: 'bg-yellow-50 border-yellow-200 text-yellow-800', icon: '⚠' },
    error:   { wrap: 'bg-red-50 border-red-200 text-red-800',      icon: '✕' },
    legal:   { wrap: 'bg-amber-50 border-amber-300 text-amber-900', icon: '⚖' },
  }

  const v = variants[variant] || variants.info

  return (
    <div className={clsx('flex gap-3 rounded-lg border p-4 text-sm', v.wrap, className)}>
      <span className="flex-shrink-0 text-base leading-5">{v.icon}</span>
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  )
}
