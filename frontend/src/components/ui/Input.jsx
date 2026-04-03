import { clsx } from 'clsx'
import { forwardRef } from 'react'

/**
 * Input — base form input
 * Handles text, email, password, tel, number
 */
const Input = forwardRef(function Input({
  label,
  error,
  hint,
  id,
  className,
  required,
  ...props
}, ref) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        required={required}
        className={clsx(
          'block w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent',
          'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
          error
            ? 'border-red-400 bg-red-50 focus:ring-red-500'
            : 'border-gray-300 bg-white',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-xs text-red-600 mt-0.5">{error}</p>
      )}
      {hint && !error && (
        <p className="text-xs text-gray-500 mt-0.5">{hint}</p>
      )}
    </div>
  )
})

export default Input
