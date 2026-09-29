'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useProtectedRoute } from '@/lib/hooks'
import UpgradeChatWidget from '@/components/chat/UpgradeChatWidget'
import { supabase } from '@/lib/supabase-client'
import PageLoading from '@/components/general/PageLoading'
import { X } from 'lucide-react'

export default function UpgradeRequestClient({ locale }: { locale: string }) {
  const router = useRouter()
  const search = useSearchParams()
  const { isProtected, user } = useProtectedRoute()

  const tierParam = search.get('tier')
  const initialTier = tierParam === 'pro' || tierParam === 'pro_max' ? tierParam : undefined

  const [prices, setPrices] = useState<Record<string, number>>({})
  const [pricesLoaded, setPricesLoaded] = useState(false)
  const [upgradeSubmitted, setUpgradeSubmitted] = useState(false)
  const [checkingTier, setCheckingTier] = useState(false)
  const [reviewMessage, setReviewMessage] = useState('')

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

  async function handleContinue() {
    if (!user?.id || checkingTier) return

    setCheckingTier(true)
    setReviewMessage('')
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('tier_id')
        .eq('id', user.id)
        .maybeSingle()

      if (error) throw error

      let tier: string | null = null
      if (profile?.tier_id) {
        const { data: tierData, error: tierError } = await supabase
          .from('tiers')
          .select('name')
          .eq('id', profile.tier_id)
          .maybeSingle()

        if (tierError) throw tierError
        tier = tierData?.name ?? null
      }

      if (!tier || tier === 'free') {
        setReviewMessage('Account under review, Try again later.')
        return
      }

      router.push(`/${locale}/dashboard`)
    } catch (error) {
      console.error('Error checking reviewed account tier:', error)
      setReviewMessage('Could not check account status. Please try again.')
    } finally {
      setCheckingTier(false)
    }
  }

  if (!isProtected || !pricesLoaded) return <PageLoading />

  return (
    <div className="relative min-h-screen bg-linear-to-b from-slate-900 via-indigo-950 to-slate-900 text-white py-8">
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Close and go back"
        title="Close"
        className="absolute right-4 top-4 z-10 rounded-full border border-white/20 p-2 text-gray-300 transition-colors hover:border-white/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <X size={20} aria-hidden="true" />
      </button>
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 md:gap-12 lg:gap-16">
          <div className="mb-8 md:mb-0">
            <h1 className="text-3xl font-bold mb-2">Upgrade Account</h1>
          </div>

          <div>
            <UpgradeChatWidget
              initialTier={initialTier}
              tierPrices={prices}
              onSubmitted={() => setUpgradeSubmitted(true)}
            />
            {upgradeSubmitted && (
              <div className="mt-4 space-y-3">
                <div
                  role={reviewMessage && reviewMessage !== 'Account under review' ? 'alert' : 'status'}
                  className={`rounded-lg border px-4 py-3 text-sm ${
                    reviewMessage === 'Account under review'
                      ? 'border-amber-400/30 bg-amber-400/10 text-amber-200'
                      : reviewMessage
                        ? 'border-red-400/30 bg-red-400/10 text-red-200'
                        : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                  }`}
                >
                  {reviewMessage || 'Upgrade request submitted.'}
                </div>
                <button
                  type="button"
                  onClick={() => void handleContinue()}
                  disabled={checkingTier}
                  className="w-full rounded-lg border border-blue-500 bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {checkingTier ? 'Checking...' : 'Continue'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}