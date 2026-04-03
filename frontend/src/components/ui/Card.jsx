import { clsx } from 'clsx'

export function Card({ children, className, onClick, hoverable = false }) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white rounded-xl border border-gray-100 shadow-card p-6',
        hoverable && 'cursor-pointer hover:shadow-card-hover transition-shadow',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }) {
  return (
    <div className={clsx('mb-4', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className }) {
  return (
    <h3 className={clsx('text-base font-semibold text-gray-900', className)}>
      {children}
    </h3>
  )
}

export function CardBody({ children, className }) {
  return (
    <div className={clsx('text-sm text-gray-600', className)}>
      {children}
    </div>
  )
}
