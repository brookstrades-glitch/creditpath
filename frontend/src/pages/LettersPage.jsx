import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Navbar from '../components/ui/Navbar'
import { Card } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Alert from '../components/ui/Alert'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import api from '../lib/api'

const LETTERS = [
  // Bureau path — §611
  { n: 1,  path: 'bureau',     title: 'Basic Bureau Dispute',               desc: 'Standard §611 dispute — inaccurate, incomplete, or unverifiable item' },
  { n: 2,  path: 'bureau',     title: 'Dispute + Method of Verification',   desc: 'Dispute + request how bureau verified the item (§611(a)(7))' },
  { n: 3,  path: 'bureau',     title: 'Dispute Inaccurate Information',     desc: 'Detailed dispute of specific inaccuracies with documentation' },
  { n: 4,  path: 'bureau',     title: 'Remove Outdated Item (§605)',        desc: 'Remove items past FCRA reporting period — §605(c) formula' },
  { n: 5,  path: 'bureau',     title: 'Dispute Unauthorized Inquiry',       desc: 'Remove hard inquiry you did not authorize (§604)' },
  // Furnisher path — §623
  { n: 6,  path: 'furnisher',  title: 'Direct Furnisher Dispute',           desc: 'Go directly to the creditor/furnisher under §623(a)(8)' },
  { n: 7,  path: 'furnisher',  title: 'Furnisher Re-Investigation',         desc: 'Request a thorough reinvestigation from the furnisher' },
  { n: 8,  path: 'furnisher',  title: 'Cease Inaccurate Reporting',         desc: 'Demand furnisher stop reporting inaccurate data (§623(a)(2))' },
  { n: 9,  path: 'furnisher',  title: 'Request Investigation Records',      desc: 'Request all records used in their investigation (§623(a)(8)(F))' },
  { n: 10, path: 'furnisher',  title: 'Furnisher Escalation',               desc: 'Escalation notice citing §616/§617 civil liability' },
  // Creditor path
  { n: 11, path: 'creditor',   title: 'Goodwill Adjustment Request',        desc: 'Request creditor remove a negative mark as a goodwill gesture' },
  { n: 12, path: 'creditor',   title: 'Pay-for-Delete Offer',               desc: 'Conditional payment offer in exchange for tradeline deletion' },
  { n: 13, path: 'creditor',   title: 'Debt Settlement Offer',              desc: 'Lump-sum settlement for less than full balance' },
  // Collector path — FDCPA
  { n: 14, path: 'collector',  title: 'FDCPA Debt Validation (§1692g)',     desc: '30-day validation demand — must be sent first before paying collector' },
]

const PATH_BADGE = {
  bureau:    'blue',
  furnisher: 'purple',
  creditor:  'green',
  collector: 'orange',
}

function LetterCard({ letter, onGenerate }) {
  return (
    <Card hoverable onClick={() => onGenerate(letter)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-bold text-gray-400">#{letter.n}</span>
            <Badge variant={PATH_BADGE[letter.path]} className="capitalize">{letter.path}</Badge>
          </div>
          <h3 className="font-semibold text-gray-900 text-sm">{letter.title}</h3>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{letter.desc}</p>
        </div>
        <Button variant="secondary" size="sm" className="flex-shrink-0">
          Generate →
        </Button>
      </div>
    </Card>
  )
}

// ─── Generate modal ───────────────────────────────────────────────────────────
function GenerateModal({ letter, onClose }) {
  const { user } = useAuth()
  const [fields, setFields] = useState({
    // Personal info — pre-fill from account if available
    fullName: user?.name || '',
    address: '', cityStateZip: '', phone: '',
    // Dispute-specific
    bureau: '', creditor: '', accountNumber: '',
    itemDescription: '', amount: '', bureauAddress: '', creditorAddress: '',
  })
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [success,  setSuccess]  = useState(false)

  const set = (key) => (e) => setFields(f => ({ ...f, [key]: e.target.value }))

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const payload = {
        letterNumber:    letter.n,
        path:            letter.path,
        // Personal info
        ...(fields.fullName      && { fullName:      fields.fullName }),
        ...(fields.address       && { address:       fields.address }),
        ...(fields.cityStateZip  && { cityStateZip:  fields.cityStateZip }),
        ...(fields.phone         && { phone:         fields.phone }),
        // Dispute-specific
        ...(fields.bureau          && { bureau:          fields.bureau }),
        ...(fields.creditor        && { creditor:        fields.creditor }),
        ...(fields.accountNumber   && { accountNumber:   fields.accountNumber }),
        ...(fields.itemDescription && { itemDescription: fields.itemDescription }),
        ...(fields.amount          && { amount:          parseFloat(fields.amount) }),
        ...(fields.bureauAddress   && { bureauAddress:   fields.bureauAddress }),
        ...(fields.creditorAddress && { creditorAddress: fields.creditorAddress }),
      }

      // Request PDF as blob
      const response = await api.post('/letters/generate', payload, {
        responseType: 'blob',
      })

      // Trigger download
      const url  = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href  = url
      link.download = `CreditPath-Letter-${letter.n}-${letter.title.replace(/\s+/g, '-')}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to generate PDF. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen title={`Letter ${letter.n} — ${letter.title}`} onClose={onClose} size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">{letter.desc}</p>

        {/* Personal info — populates signature block in PDF */}
        <div className="space-y-3 pb-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your Information</p>
          <Input label="Full Legal Name" required value={fields.fullName} onChange={set('fullName')} placeholder="As it should appear on the letter" />
          <Input label="Street Address" value={fields.address} onChange={set('address')} placeholder="123 Main St" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="City, State ZIP" value={fields.cityStateZip} onChange={set('cityStateZip')} placeholder="Houston, TX 77001" />
            <Input label="Phone Number" value={fields.phone} onChange={set('phone')} placeholder="(555) 000-0000" />
          </div>
        </div>

        {/* Path-specific fields */}
        {(letter.path === 'bureau') && (
          <div className="space-y-3">
            <Input label="Bureau Name" placeholder="e.g. equifax" value={fields.bureau} onChange={set('bureau')} />
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Bureau Address (optional)</label>
              <textarea rows={2} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-600 focus:outline-none" placeholder="Leave blank to auto-fill known addresses" value={fields.bureauAddress} onChange={set('bureauAddress')} />
            </div>
          </div>
        )}

        {(letter.path === 'furnisher' || letter.path === 'creditor' || letter.path === 'collector') && (
          <div className="space-y-3">
            <Input label="Creditor / Company Name" value={fields.creditor} onChange={set('creditor')} />
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Recipient Address (optional)</label>
              <textarea rows={2} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-600 focus:outline-none" value={fields.creditorAddress} onChange={set('creditorAddress')} />
            </div>
          </div>
        )}

        <Input label="Account Number" value={fields.accountNumber} onChange={set('accountNumber')} placeholder="Account # being disputed" />
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Item Description</label>
          <textarea rows={2} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-600 focus:outline-none" placeholder="Describe the item being disputed or amount owed" value={fields.itemDescription} onChange={set('itemDescription')} />
        </div>
        {(letter.n === 12 || letter.n === 13 || letter.n === 14) && (
          <Input label="Balance / Amount" type="number" min="0" step="0.01" value={fields.amount} onChange={set('amount')} placeholder="0.00" />
        )}

        {/* Send options */}
        <Alert variant="info" title="Sending this letter">
          <ul className="text-xs space-y-1 mt-1">
            <li>📥 <strong>Download PDF</strong> — Print and mail via USPS Certified Mail (recommended — proves delivery date for FCRA clock)</li>
            <li>📠 <strong>Fax</strong> — Coming soon (Phaxio integration)</li>
          </ul>
        </Alert>

        {error   && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">PDF downloaded! Mail it via certified mail to start the 30-day FCRA clock.</Alert>}

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={handleGenerate}>
            📥 Download PDF
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LettersPage() {
  const [searchParams] = useSearchParams()
  const [selected,  setSelected]  = useState(null)
  const [filter,    setFilter]    = useState('all')

  // Auto-open if coming from action plan link
  const preselectedNum = parseInt(searchParams.get('letter'))
  if (preselectedNum && !selected) {
    const letter = LETTERS.find(l => l.n === preselectedNum)
    if (letter) setSelected(letter)
  }

  const filtered = filter === 'all' ? LETTERS : LETTERS.filter(l => l.path === filter)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-5">

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Letter Generator</h1>
          <p className="text-sm text-gray-500 mt-1">
            14 FCRA + FDCPA letter templates · Download as PDF · You submit them personally
          </p>
        </div>

        <Alert variant="legal">
          These letters are for your personal use only. You must send them yourself.
          CreditPath is not a Credit Repair Organization and does not submit letters on your behalf.
        </Alert>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {['all','bureau','furnisher','creditor','collector'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? 'bg-primary-700 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'All 14 Letters' : `${f} (§${f === 'collector' ? '1692g' : f === 'bureau' ? '611' : '623'})`}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map(letter => (
            <LetterCard key={letter.n} letter={letter} onGenerate={setSelected} />
          ))}
        </div>
      </main>

      {selected && (
        <GenerateModal letter={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
