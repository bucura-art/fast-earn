'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/hooks'
import { Phone } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'

type UpgradeTier = 'pro' | 'pro_max'

interface UpgradeChatWidgetProps {
  initialTier?: string
  tierPrices: Record<string, number>
  onSubmitted?: () => void
}

const UPGRADE_LABELS: Record<UpgradeTier, string> = {
  pro: 'Pro',
  pro_max: 'Pro Max',
}

function UssdCopy({ code }: { code: string }) {
  // The '#' character must be URL-encoded for the 'tel:' link to work correctly.
  const telLink = `tel:${code.replace(/#/g, '%23')}`

  return (
    <a
      href={telLink}
      className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded cursor-pointer hover:bg-white/10 transition-colors"
      title="Click to dial"
    >
      <span className="font-bold text-white select-all">{code}</span>
      <Phone size={14} className="text-blue-300" />
    </a>
  )
}

export default function UpgradeChatWidget({ initialTier, tierPrices, onSubmitted }: UpgradeChatWidgetProps) {
  const { user } = useAuth()

  const [selectedTier, setSelectedTier] = useState<UpgradeTier | null>(
    initialTier === 'pro' || initialTier === 'pro_max' ? initialTier : null
  )
  const [phone, setPhone] = useState('')
  const [expectingPhone, setExpectingPhone] = useState(false)
  const [sending, setSending] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [momoPayCode, setMomoPayCode] = useState<string>('387483')

  useEffect(() => {
    if (initialTier === 'pro' || initialTier === 'pro_max') {
      setSelectedTier(initialTier)
    }
  }, [initialTier])

  // Fetch momo pay code from system settings
  useEffect(() => {
    const fetchMomoCode = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'momo_pay_code')
        .single()
      if (data?.value) setMomoPayCode(data.value)
    }
    fetchMomoCode()
  }, [])

  const amount = selectedTier ? tierPrices[selectedTier] || 0 : 0
  const ussd = selectedTier ? `*182*8*1*${momoPayCode}*${Math.ceil(amount)}#` : ''
  const telLink = `tel:${ussd.replace(/#/g, '%23')}`

  async function handlePaid() {
    if (!expectingPhone) {
      setExpectingPhone(true)
      setErrorMessage('')
      return
    }

    if (!user || !selectedTier || !phone.trim() || sending || submitted) return

    const paidPhone = phone.trim()
    if (!/^[0-9+]{8,15}$/.test(paidPhone)) {
      setErrorMessage('Enter a valid phone number.')
      return
    }

    setSending(true)
    setErrorMessage('')
    try {
      const response = await fetch('/api/upgrade-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          requestedTier: selectedTier,
          amount,
          paidPhone,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.error || 'Could not submit the upgrade request.')
      }

      setSubmitted(true)
      setExpectingPhone(false)
      onSubmitted?.()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not submit the upgrade request.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl rounded-xl border border-white/10 bg-white/5 p-5 text-white">
      {!selectedTier ? (
        <label className="block space-y-2">
          <span className="text-sm text-gray-300">Category</span>
          <select
            value=""
            onChange={(event) => {
              if (event.target.value === 'pro' || event.target.value === 'pro_max') {
                setSelectedTier(event.target.value)
              }
            }}
            className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white"
          >
            <option value="" disabled>Select a category</option>
            <option value="pro">Pro</option>
            <option value="pro_max">Pro Max</option>
          </select>
        </label>
      ) : (
        <div className="space-y-4">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-400">Category</dt>
              <dd className="font-semibold">{UPGRADE_LABELS[selectedTier]}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-400">Amount</dt>
              <dd className="font-semibold text-emerald-400">{amount.toLocaleString()} RWF</dd>
            </div>
            <div className="flex justify-between items-center gap-4 border-t border-white/10 pt-3">
              <dt className="text-gray-400">Dial</dt>
              <dd><UssdCopy code={ussd} /></dd>
            </div>
          </dl>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-300">Click 👉👉</span>
            <a
              href={telLink}
              className="flex-1 rounded-lg bg-emerald-500 px-4 py-3 text-center font-bold text-white transition-colors hover:bg-emerald-600"
            >
              PAY
            </a>
          </div>

          {expectingPhone && !submitted && (
            <div className="space-y-2">
              <label htmlFor="paid-phone" className="sr-only">Phone Number</label>
              <input
                id="paid-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void handlePaid()
                  }
                }}
                placeholder="Phone used to pay"
                className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white placeholder:text-gray-400"
              />
            </div>
          )}

          <p className="mt-8 pt-4 text-center text-sm text-gray-300">After sending money click below 👇</p>
          {errorMessage && <p role="alert" className="text-sm text-red-300">{errorMessage}</p>}
          <button
            type="button"
            onClick={() => void handlePaid()}
            disabled={sending || submitted}
            className={`w-full rounded-lg border px-4 py-3 font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              phone.trim()
                ? 'border-blue-500 bg-blue-600 hover:bg-blue-500'
                : 'border-white/20 hover:bg-white/10'
            }`}
          >
            {sending ? 'Submitting...' : 'I have paid'}
          </button>
        </div>
      )}
    </div>
  )
}
