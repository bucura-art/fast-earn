'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useProtectedRoute } from '@/lib/hooks'
import UpgradeChatWidget from '@/components/chat/UpgradeChatWidget'
import { supabase } from '@/lib/supabase-client'
import { Check, X } from 'lucide-react'
import PageLoading from '@/components/general/PageLoading'

interface PromoCodeResponse {
  valid: boolean
  code?: string
  discountPercent?: number
  description?: string
  error?: string
}

const TIER_LABELS: Record<string, string> = {
  pro: 'Pro',
  pro_max: 'Pro Max',
}

export default function UpgradeRequestClient({ locale }: { locale: string }) {
  const router = useRouter()
  const search = useSearchParams()
  const { isProtected } = useProtectedRoute()

  const tierParam = search.get('tier')
  const initialTier = tierParam === 'pro' || tierParam === 'pro_max' ? tierParam : undefined

  const [showPromoModal, setShowPromoModal] = useState(!!initialTier)
  const [promoInput, setPromoInput] = useState('')
  const [promoValidated, setPromoValidated] = useState<PromoCodeResponse | null>(null)
  const [validatingPromo, setValidatingPromo] = useState(false)
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null)
  const [appliedDiscount, setAppliedDiscount] = useState<number | null>(null)
  const [userSkippedPromo, setUserSkippedPromo] = useState(false)
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [pricesLoaded, setPricesLoaded] = useState(false)

  useEffect(() => {
    async function fetchPrices() {
      try {
        const { data } = await supabase.from('tiers').select('name, monthly_price')
        if (data) {
          const newPrices: Record<string, number> = {}
          data.forEach((t) => {
            if (t.name) newPrices[t.name] = t.monthly_price
          })
          setPrices(newPrices)
        }
      } finally {
        setPricesLoaded(true)
      }
    }
    void fetchPrices()
  }, [])

  const tierPrice = initialTier && prices[initialTier] ? prices[initialTier] : 0
  const discountAmount = appliedDiscount ? Math.ceil((tierPrice * appliedDiscount) / 100) : 0
  const finalAmount = tierPrice - discountAmount

  useEffect(() => {
    if (!initialTier) {
      setShowPromoModal(false)
    }
  }, [initialTier])

  async function validatePromo() {
    if (!promoInput.trim()) {
      setPromoValidated({ valid: false, error: 'Please enter a promo code' })
      return
    }

    setValidatingPromo(true)
    try {
      const res = await fetch('/api/validate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoInput.trim() }),
      })
      const data = (await res.json()) as PromoCodeResponse
      setPromoValidated(data)
    } catch (error) {
      setPromoValidated({ valid: false, error: 'Failed to validate promo code' })
    } finally {
      setValidatingPromo(false)
    }
  }

  function handleApplyPromo() {
    if (promoValidated?.valid) {
      setAppliedPromoCode(promoValidated.code || null)
      setAppliedDiscount(promoValidated.discountPercent || null)
      setShowPromoModal(false)
      setPromoInput('')
      setPromoValidated(null)
    }
  }

  function handleContinueWithoutPromo() {
    setAppliedPromoCode(null)
    setAppliedDiscount(null)
    setUserSkippedPromo(true)
    setShowPromoModal(false)
    setPromoInput('')
    setPromoValidated(null)
  }

  if (!isProtected || !pricesLoaded) return <PageLoading />

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <a href={`/${locale}/pricing`} className="text-sm text-gray-300 hover:text-white">
            {'<-'} Back to pricing
          </a>
        </div>

        <div className="grid md:grid-cols-2 md:gap-12 lg:gap-16">
          <div className="mb-8 md:mb-0">
            <h1 className="text-3xl font-bold mb-2">Upgrade Request</h1>
            <p className="text-gray-300">
              Follow the guided flow to submit your upgrade payment details via our agency.
            </p>
          </div>

          <div>
            <UpgradeChatWidget
              initialTier={initialTier}
              locale={locale}
              promoCode={appliedPromoCode}
              promoDiscount={appliedDiscount}
              tierPrices={prices}
              onSwitchFlow={(flow) => {
                if (flow === 'withdraw') {
                  router.push(`/${locale}/dashboard/withdrawals/request`)
                  return
                }
                if (flow === 'support') {
                  router.push(`/${locale}/support`)
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Promo Code Modal */}
      {showPromoModal && initialTier && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-6">
            <h2 className="text-2xl font-bold mb-2">Enter promo code</h2>
            <hr className="my-4 border-white/10" />
            <p className="text-sm text-gray-300 mb-6">
              You will be charged <span className="font-bold text-emerald-400">{tierPrice.toLocaleString()} RWF</span> to upgrade your account to {TIER_LABELS[initialTier]}. Enter promo code to get discount
            </p>

            <div className="space-y-4">
              <input
                type="text"
                value={promoInput}
                onChange={(e) => {
                  setPromoInput(e.target.value)
                  setPromoValidated(null)
                }}
                placeholder="Enter promo code"
                className="w-full px-4 py-3 rounded-xl bg-white/10 text-white border border-white/10 placeholder:text-gray-400 focus:outline-none focus:border-blue-500"
              />

              {validatingPromo && (
                <p className="text-sm text-gray-400 flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  Validating...
                </p>
              )}

              {promoValidated && (
                <div
                  className={`p-3 rounded-lg border text-sm ${
                    promoValidated.valid
                      ? 'bg-green-900/20 border-green-500/50 text-green-200'
                      : 'bg-red-900/20 border-red-500/50 text-red-200'
                  }`}
                >
                  {promoValidated.valid ? (
                    <div className="space-y-2">
                      <p className="flex items-center gap-2">
                        <Check size={16} /> Promo code is valid!
                      </p>
                      {promoValidated.description && (
                        <p className="text-xs opacity-80">{promoValidated.description}</p>
                      )}
                      <div className="mt-3 pt-3 border-t border-green-500/30 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Original Price:</span>
                          <span className="line-through">{tierPrice.toLocaleString()} RWF</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>Discount ({promoValidated.discountPercent}%):</span>
                          <span className="text-green-400">
                            -{Math.ceil((tierPrice * promoValidated.discountPercent!) / 100).toLocaleString()} RWF
                          </span>
                        </div>
                        <div className="flex justify-between text-sm font-bold pt-2 border-t border-green-500/30 mt-2">
                          <span>Final Price:</span>
                          <span className="text-emerald-400">
                            {Math.ceil(tierPrice - (tierPrice * promoValidated.discountPercent!) / 100).toLocaleString()} RWF
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="flex items-center gap-2">
                      <X size={16} /> {promoValidated.error || 'Invalid promo code'}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleContinueWithoutPromo}
                  disabled={validatingPromo}
                  className="flex-1 px-4 py-2 rounded-lg bg-orange-400 hover:bg-white/20 text-white text-sm disabled:opacity-50 transition-colors"
                >
                  Continue without code
                </button>
                <button
                  onClick={() => void validatePromo()}
                  disabled={validatingPromo || !promoInput.trim()}
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm disabled:opacity-50 transition-colors font-medium"
                >
                  {validatingPromo ? 'Checking...' : 'Validate'}
                </button>
              </div>

              {promoValidated?.valid && (
                <button
                  onClick={handleApplyPromo}
                  className="w-full px-4 py-3 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold transition-colors"
                >
                  Apply & Continue
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}