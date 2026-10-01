'use client'

import { use, useEffect, useState } from 'react'
import PricingPlanCta from '@/components/pricing/PricingPlanCta'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getUserSubscription } from '@/lib/subscription'
import supabase from '@/lib/supabaseClient'

interface PageProps {
  params: Promise<{ locale: string }>
}

export default function PricingPage({ params }: PageProps) {
  const { locale } = use(params)
  const router = useRouter()
  const [currentUserTier, setCurrentUserTier] = useState<string | null>(null)
  const [tierLoading, setTierLoading] = useState(true)
  const [prices, setPrices] = useState<Record<string, number>>({
    pro: 6000,
    pro_max: 12000,
  })

  useEffect(() => {
    async function loadData() {
      try {
        const { data: tiersData } = await supabase.from('tiers').select('name, monthly_price')

        if (tiersData) {
          const newPrices: Record<string, number> = { ...prices }
          tiersData.forEach((t) => {
            if (t.name) newPrices[t.name] = t.monthly_price
          })
          setPrices(newPrices)
        }

        const user = await getCurrentUser()
        if (user) {
          // 1. Try active subscription
          const subscription = await getUserSubscription(user.id)
          if (subscription?.tier) {
            const tier = Array.isArray(subscription.tier) ? subscription.tier[0] : subscription.tier
            if (tier?.name) {
              setCurrentUserTier(tier.name)
              return
            }
          }

          // 2. Fallback to user profile
          if (user.tier_id) {
            const { data: tierData } = await supabase
              .from('tiers')
              .select('name')
              .eq('id', user.tier_id)
              .maybeSingle()
            if (tierData?.name) {
              setCurrentUserTier(tierData.name)
              return
            }
          }

          setCurrentUserTier('free')
        }
      } catch (error) {
        console.error('Error fetching pricing data:', error)
      } finally {
        setTierLoading(false)
      }
    }
    loadData()
  }, [])

  return (
    <div className="relative min-h-screen bg-linear-to-b from-slate-900 via-indigo-950 to-slate-900 text-white py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4 text-white">
            Membership
          </h1>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Pro Tier */}
          <div className="border-2 border-blue-500 bg-blue-900/10 rounded-2xl p-8 flex flex-col relative shadow-2xl shadow-blue-900/20 transform md:-translate-y-4">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
              MOST POPULAR
            </div>
            <h2 className="text-2xl font-bold mb-2">Pro Account</h2>
            <div className="text-4xl text-emerald-400 font-bold mb-6">{prices.pro.toLocaleString()} RWF</div>
            
            <ul className="space-y-4 mb-8 grow">
              <li className="flex items-center text-white">
                <span className="text-green-400 mr-3">✓</span> 10 Tasks <span className="text-lg font-normal text-gray-400">/Day</span>
              </li>
              <li className="flex items-center text-white">
                <span className="text-green-400 mr-3">✓</span> 10 Videos <span className="text-lg font-normal text-gray-400">/Day</span>
              </li>
              <li className="flex items-center text-white">
                <span className="text-green-400 mr-3">✓</span> 3,000 RWF <span className="text-lg font-normal text-gray-400">/Referral</span>
              </li>
            </ul>
            <PricingPlanCta plan="pro" locale={locale} currentUserTier={currentUserTier} tierLoading={tierLoading} className="block w-full py-3 px-6 text-center rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-colors shadow-lg disabled:opacity-60">
              {currentUserTier === 'pro' ? 'Your current plan' : 'Get Pro'}
            </PricingPlanCta>
          </div>

          {/* Pro Max Tier */}
          <div className="border border-purple-500/50 bg-white/5 rounded-2xl p-8 flex flex-col hover:border-purple-500 transition-colors">
            <h2 className="text-2xl font-bold mb-2 text-white">Pro Max Account</h2>
            <div className="text-4xl text-emerald-400 font-bold mb-6">{prices.pro_max.toLocaleString()} RWF</div>
            
            <ul className="space-y-4 mb-8 grow">
              <li className="flex items-center text-gray-300">
                <span className="text-purple-400 mr-3">✓</span> 20 Tasks <span className="text-lg font-normal text-gray-400">/Day</span>
              </li>
              <li className="flex items-center text-gray-300">
                <span className="text-purple-400 mr-3">✓</span> 20 Videos <span className="text-lg font-normal text-gray-400">/Day</span>
              </li>
              <li className="flex items-center text-gray-300">
                <span className="text-purple-400 mr-3">✓</span> 3,000 RWF <span className="text-lg font-normal text-gray-400">/Referral</span>
              </li>
            </ul>
            <PricingPlanCta plan="pro_max" locale={locale} currentUserTier={currentUserTier} tierLoading={tierLoading} className="block w-full py-3 px-6 text-center rounded-xl border bg-blue-600 text-white font-bold hover:bg-blue-500/10 transition-colors disabled:opacity-60">
              {currentUserTier === 'pro_max' ? 'Your current plan' : 'Get Pro Max'}
            </PricingPlanCta>
          </div>

        </div>
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10"
          >
            <X size={18} aria-hidden="true" />
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
