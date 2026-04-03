import { clsx } from 'clsx'

/**
 * BureauPill — bureau brand chip with status color
 * Bureaus: equifax | experian | transunion
 * Statuses: success | error | no-hit | freeze | unknown
 */

const bureauConfig = {
  equifax:    { label: 'EFX', fullLabel: 'Equifax',    bg: 'bg-[#cc0000]' },
  experian:   { label: 'EXP', fullLabel: 'Experian',   bg: 'bg-[#0066a1]' },
  transunion: { label: 'TU',  fullLabel: 'TransUnion', bg: 'bg-[#00a9e0]' },
}

const statusStyles = {
  success: 'ring-green-400 opacity-100',
  error:   'ring-red-400   opacity-80',
  'no-hit':'ring-gray-300  opacity-60',
  freeze:  'ring-yellow-400 opacity-90',
  unknown: 'ring-gray-200  opacity-50',
}

export default function BureauPill({ bureau, status = 'success', showFull = false }) {
  const config = bureauConfig[bureau?.toLowerCase()] || { label: bureau, fullLabel: bureau, bg: 'bg-gray-400' }
  const statusStyle = statusStyles[status] || statusStyles.unknown

  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-xs font-semibold ring-2',
      config.bg,
      statusStyle
    )}>
      {showFull ? config.fullLabel : config.label}
      {status === 'freeze'  && <span title="Credit frozen">❄</span>}
      {status === 'error'   && <span title="Pull failed">!</span>}
      {status === 'no-hit'  && <span title="No file found">∅</span>}
    </span>
  )
}

/** Row of all 3 bureau pills with statuses */
export function BureauStatusRow({ statuses = {} }) {
  const bureaus = ['equifax', 'experian', 'transunion']
  return (
    <div className="flex items-center gap-1.5">
      {bureaus.map(b => (
        <BureauPill key={b} bureau={b} status={statuses[b] || 'unknown'} />
      ))}
    </div>
  )
}
