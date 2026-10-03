'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Phone } from 'lucide-react'
import { useAuth } from '@/lib/hooks'
import supabase from '@/lib/supabaseClient'
import type { VipProduct } from '@/lib/products'
import PaymentAlert from '@/components/support/PaymentAlert'

interface InvestChatWidgetProps {
  locale: string
  product: VipProduct
  onSubmitted?: () => void
}

function UssdCopy({ code }: { code: string }) {
  return (
    <a
      href={`tel:${code.replace(/#/g, '%23')}`}
      className="flex items-center gap-2 rounded bg-white/5 px-2 py-1 transition-colors hover:bg-white/10"
      title="Click to dial"
    >
      <span className="select-all font-bold text-white">{code}</span>
      <Phone size={14} className="text-blue-300" aria-hidden="true" />
    </a>
  )
}

export default function InvestChatWidget({ locale, product, onSubmitted }: InvestChatWidgetProps) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [phone, setPhone] = useState('')
  const [expectingPhone, setExpectingPhone] = useState(false)
  const [sending, setSending] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showPaymentAlert, setShowPaymentAlert] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [momoPayCode, setMomoPayCode] = useState('387483')

  useEffect(() => {
    const fetchMomoCode = async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'momo_pay_code')
        .maybeSingle()

      if (error) {
        console.error('Error loading mobile money payment code:', error)
        return
      }

      if (data?.value) setMomoPayCode(data.value)
    }

    void fetchMomoCode()
  }, [])

  const ussd = `*182*8*1*${momoPayCode}*${product.price}#`

  async function handlePaid() {
    if (!expectingPhone) {
      setExpectingPhone(true)
      setErrorMessage('')
      return
    }

    if (authLoading || sending || submitted) return
    if (!user) {
      setErrorMessage('Your session has expired. Please sign in again.')
      return
    }

    const paidPhone = phone.trim()
    if (!/^[0-9+]{8,15}$/.test(paidPhone)) {
      setErrorMessage('Enter a valid payment phone number.')
      return
    }

    setSending(true)
    setErrorMessage('')
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError

      const accessToken = sessionData.session?.access_token
      if (!accessToken) throw new Error('Your session has expired. Please sign in again.')

      const response = await fetch('/api/product-purchase-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ productCode: product.code, paidPhone }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || 'Could not submit the purchase request.')
      }

      setSubmitted(true)
      setExpectingPhone(false)
      setShowPaymentAlert(true)
      onSubmitted?.()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not submit the purchase request.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
    <div className="mx-auto w-full max-w-xl rounded-xl border border-white/10 bg-white/5 p-5 text-white">
      <h2 className="mb-4 text-xl font-bold">{product.name}</h2>
      <dl className="space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-gray-400">Price</dt>
          <dd className="font-semibold text-emerald-400">{product.price.toLocaleString()} RWF</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-gray-400">Daily income</dt>
          <dd className="font-semibold">{product.dailyIncome.toLocaleString()} RWF</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-gray-400">Duration</dt>
          <dd className="font-semibold">{product.durationDays} days</dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-3">
          <dt className="text-gray-400">Dial</dt>
          <dd><UssdCopy code={ussd} /></dd>
        </div>
      </dl>

      <div className="mt-5 flex items-center gap-3">
        <span className="text-sm text-gray-300">👉👉</span>
        <a
          href={`tel:${ussd.replace(/#/g, '%23')}`}
          className="flex-1 rounded-lg bg-emerald-500 px-4 py-3 text-center font-bold text-white transition-colors hover:bg-emerald-600"
        >
          Click here to PAY
        </a>
      </div>

      {expectingPhone && !submitted && (
        <div className="mt-4">
          <label htmlFor="investment-paid-phone" className="sr-only">Phone used to pay</label>
          <input
            id="investment-paid-phone"
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

      <p className="mt-8 pt-4 text-center text-sm text-gray-300">
        After sending money click below 👇
      </p>
      {errorMessage && <p role="alert" className="mt-2 text-sm text-red-300">{errorMessage}</p>}
      <button
        type="button"
        onClick={() => {
          if (submitted) {
            router.push(`/${locale}/dashboard`)
            return
          }
          void handlePaid()
        }}
        disabled={authLoading || sending}
        className="mt-2 w-full rounded-lg border border-blue-500 bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {sending ? 'Submitting...' : submitted ? 'Continue' : 'I have paid'}
      </button>
    </div>
    {showPaymentAlert && (
      <PaymentAlert
        onContinue={() => {
          setShowPaymentAlert(false)
          router.push(`/${locale}/dashboard`)
        }}
      />
    )}
    </>
  )
}