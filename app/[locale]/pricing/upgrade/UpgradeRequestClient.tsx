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
  const { isProtected } = useProtectedRoute()

  const tierParam = search.get('tier')
  const initialTier = tierParam === 'pro' || tierParam === 'pro_max' ? tierParam : undefined

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
      <div className="container mx-auto max-w-3xl px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Upgrade Account</h1>
        </div>

        <UpgradeChatWidget
          locale={locale}
          initialTier={initialTier}
          tierPrices={prices}
        />
      </div>

    </div>
  )
}