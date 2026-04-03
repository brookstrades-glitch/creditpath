import { clsx } from 'clsx'

/**
 * ScoreBadge — credit score display with color tier
 * Tiers: excellent (750+) | good (700-749) | fair (640-699) | poor (580-639) | bad (<580)
 */

function getScoreTier(score) {
  if (score === null || score === undefined) return { label: 'N/A', color: 'gray' }
  if (score >= 750) return { label: 'Excellent', color: 'excellent' }
  if (score >= 700) return { label: 'Good',      color: 'good' }
  if (score >= 640) return { label: 'Fair',       color: 'fair' }
  if (score >= 580) return { label: 'Poor',       color: 'poor' }
  return               { label: 'Very Poor',   color: 'bad' }
}

const tierStyles = {
  excellent: { ring: 'ring-green-400',  bg: 'bg-green-50',  text: 'text-green-700',  label: 'text-green-600' },
  good:      { ring: 'ring-lime-400',   bg: 'bg-lime-50',   text: 'text-lime-700',   label: 'text-lime-600' },
  fair:      { ring: 'ring-yellow-400', bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'text-yellow-600' },
  poor:      { ring: 'ring-orange-400', bg: 'bg-orange-50', text: 'text-orange-700', label: 'text-orange-600' },
  bad:       { ring: 'ring-red-400',    bg: 'bg-red-50',    text: 'text-red-700',    label: 'text-red-600' },
  gray:      { ring: 'ring-gray-300',   bg: 'bg-gray-50',   text: 'text-gray-500',   label: 'text-gray-400' },
}

export default function ScoreBadge({ score, model, size = 'md' }) {
  const { label, color } = getScoreTier(score)
  const styles = tierStyles[color]

  const sizes = {
    sm: { score: 'text-2xl', label: 'text-xs', model: 'text-xs', ring: 'ring-2', pad: 'p-3 w-20 h-20' },
    md: { score: 'text-3xl', label: 'text-xs', model: 'text-xs', ring: 'ring-2', pad: 'p-4 w-24 h-24' },
    lg: { score: 'text-4xl', label: 'text-sm', model: 'text-xs', ring: 'ring-4', pad: 'p-5 w-32 h-32' },
  }

  const s = sizes[size]

  return (
    <div className={clsx(
      'inline-flex flex-col items-center justify-center rounded-full',
      styles.bg, styles.ring, s.ring, s.pad
    )}>
      <span className={clsx('font-bold leading-none', styles.text, s.score)}>
        {score ?? '—'}
      </span>
      <span className={clsx('font-semibold mt-0.5', styles.label, s.label)}>
        {label}
      </span>
      {model && (
        <span className={clsx('text-gray-400 mt-0.5', s.model)}>
          {model}
        </span>
      )}
    </div>
  )
}

export { getScoreTier }
