import { clsx } from 'clsx'

/**
 * Button — base component
 * Variants: primary | secondary | ghost | danger
 * Sizes: sm | md | lg
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  type = 'button',
  className,
  onClick,
  ...props
}) {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary:   'bg-primary-700 text-white hover:bg-primary-800 active:bg-primary-900',
    secondary: 'bg-white text-primary-700 border border-primary-300 hover:bg-primary-50 active:bg-primary-100',
    ghost:     'bg-transparent text-gray-600 hover:bg-gray-100 active:bg-gray-200',
    danger:    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={clsx(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading && (
        <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
      )}
      {children}
    </button>
  )
}
