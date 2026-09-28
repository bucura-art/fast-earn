'use client'

import { use, useEffect, useState } from 'react'
import PricingPlanCta from '@/components/pricing/PricingPlanCta'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getUserSubscription } from '@/lib/subscription'
import supabase from '@/lib/supabaseClient'

interface PageProps {
  params: Promise<{ locale: string }>
}

export default function PricingPage({ params }: PageProps) {
  const { locale } = use(params)
  const [currentUserTier, setCurrentUserTier] = useState<string | null>(null)
  const [tierLoading, setTierLoading] = useState(true)
  const [prices, setPrices] = useState<Record<string, number>>({
    free: 0,
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
    <div className="min-h-screen bg-linear-to-b from-slate-900 via-indigo-950 to-slate-900 text-white py-20">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <Link href={`/${locale}/workspace`} className="inline-flex items-center text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
        </div>
        <div className="text-center mb-16">
          <h1 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-linear-to-r from-blue-400 to-emerald-400">
            Membership categories
          </h1>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Pro Tier */}
          <div className="border-2 border-blue-500 bg-blue-900/10 rounded-2xl p-8 flex flex-col relative shadow-2xl shadow-blue-900/20 transform md:-translate-y-4">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
              MOST POPULAR
            </div>
            <h2 className="text-2xl font-bold mb-2">Pro</h2>
            <p className="text-gray-400 mb-6">Boost your daily earnings.</p>
            <div className="text-4xl text-emerald-400 font-bold mb-6">{prices.pro.toLocaleString()} RWF<span className="text-lg font-normal text-gray-400">/month</span></div>
            
            <ul className="space-y-4 mb-8 grow">
              <li className="flex items-center text-white">
                <span className="text-green-400 mr-3">✓</span> 10 Tasks per day
              </li>
              <li className="flex items-center text-white">
                <span className="text-green-400 mr-3">✓</span> 2.0x Reward Multiplier
              </li>
              <li className="flex items-center text-white">
                <span className="text-green-400 mr-3">✓</span> Priority Support
              </li>
              <li className="flex items-center text-white">
                <span className="text-green-400 mr-3">✓</span> 10% Referral Bonus
              </li>
              <li className="flex items-center text-white">
                <span className="text-green-400 mr-3">✓</span> Faster Withdrawals
              </li>
            </ul>
            <PricingPlanCta plan="pro" locale={locale} currentUserTier={currentUserTier} tierLoading={tierLoading} className="block w-full py-3 px-6 text-center rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-colors shadow-lg disabled:opacity-60">
              {currentUserTier === 'pro' ? 'Your current plan' : 'Get Pro'}
            </PricingPlanCta>
          </div>

          {/* Pro Max Tier */}
          <div className="border border-purple-500/50 bg-white/5 rounded-2xl p-8 flex flex-col hover:border-purple-500 transition-colors">
            <h2 className="text-2xl font-bold mb-2 text-purple-300">Pro Max</h2>
            <p className="text-gray-400 mb-6">Maximum earning potential.</p>
            <div className="text-4xl text-emerald-400 font-bold mb-6">{prices.pro_max.toLocaleString()} RWF<span className="text-lg font-normal text-gray-400">/month</span></div>
            
            <ul className="space-y-4 mb-8 grow">
              <li className="flex items-center text-gray-300">
                <span className="text-purple-400 mr-3">✓</span> 20 Tasks per day
              </li>
              <li className="flex items-center text-gray-300">
                <span className="text-purple-400 mr-3">✓</span> 3x Reward Multiplier
              </li>
              <li className="flex items-center text-gray-300">
                <span className="text-purple-400 mr-3">✓</span> VIP Support
              </li>
              <li className="flex items-center text-gray-300">
                <span className="text-purple-400 mr-3">✓</span> 20% Referral Bonus
              </li>
              <li className="flex items-center text-gray-300">
                <span className="text-purple-400 mr-3">✓</span> Instant Withdrawals
              </li>
            </ul>
            <PricingPlanCta plan="pro_max" locale={locale} currentUserTier={currentUserTier} tierLoading={tierLoading} className="block w-full py-3 px-6 text-center rounded-xl border border-purple-500 text-purple-300 font-bold hover:bg-purple-500/10 transition-colors disabled:opacity-60">
              {currentUserTier === 'pro_max' ? 'Your current plan' : 'Get Pro Max'}
            </PricingPlanCta>
          </div>

          {/* Free Tier */}
          <div className="border border-white/10 bg-white/5 rounded-2xl p-8 flex flex-col hover:border-blue-500/30 transition-colors">
            <h2 className="text-2xl font-bold mb-2">Free</h2>
            <p className="text-gray-400 mb-6">Perfect for getting started.</p>
            <div className="text-4xl text-emerald-400 font-bold mb-6">{prices.free.toLocaleString()} RWF<span className="text-lg font-normal text-gray-400">/month</span></div>
            
            <ul className="space-y-4 mb-8 grow">
              <li className="flex items-center text-gray-300">
                <span className="text-green-400 mr-3">✓</span> 5 Tasks per day
              </li>
              <li className="flex items-center text-gray-300">
                <span className="text-green-400 mr-3">✓</span> 1x Reward Multiplier
              </li>
              <li className="flex items-center text-gray-300">
                <span className="text-green-400 mr-3">✓</span> Standard Support
              </li>
              <li className="flex items-center text-gray-300">
                <span className="text-green-400 mr-3">✓</span> 5% Referral Bonus
              </li>
              <li className="flex items-center text-gray-300">
                <span className="text-green-400 mr-3">✓</span> Lower Withdrawals
              </li>
            </ul>
            <PricingPlanCta plan="free" locale={locale} currentUserTier={currentUserTier} tierLoading={tierLoading} className="block w-full py-3 px-6 text-center rounded-xl border border-blue-500 text-blue-400 font-bold hover:bg-blue-500/10 transition-colors disabled:opacity-60">
              {currentUserTier === 'free' ? 'Your current plan' : 'Start for Free'}
            </PricingPlanCta>
          </div>
        </div>

        {/* Comparison Table for larger screens */}
        <div className="mt-20 hidden md:block">
          <h3 className="text-3xl font-bold text-center mb-10">Detailed Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="p-4 border-b border-white/10 w-1/4">Feature</th>
                  <th className="p-4 border-b border-white/10 w-1/4 text-center">Free</th>
                  <th className="p-4 border-b border-blue-500/50 bg-blue-900/10 w-1/4 text-center text-blue-300 font-bold">Pro</th>
                  <th className="p-4 border-b border-white/10 w-1/4 text-center text-purple-300 font-bold">Pro Max</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="p-4 text-gray-300">Daily Tasks</td>
                  <td className="p-4 text-center">5</td>
                  <td className="p-4 text-center bg-blue-900/5 font-semibold">10</td>
                  <td className="p-4 text-center font-bold text-purple-300">20</td>
                </tr>
                <tr>
                  <td className="p-4 text-gray-300">Reward Multiplier</td>
                  <td className="p-4 text-center">1x</td>
                  <td className="p-4 text-center bg-blue-900/5 font-semibold">2.0x</td>
                  <td className="p-4 text-center font-bold text-purple-300">3x</td>
                </tr>
                <tr>
                  <td className="p-4 text-gray-300">Referral Bonus</td>
                  <td className="p-4 text-center">5%</td>
                  <td className="p-4 text-center bg-blue-900/5 font-semibold">10%</td>
                  <td className="p-4 text-center font-bold text-purple-300">20%</td>
                </tr>
                <tr>
                  <td className="p-4 text-gray-300">Withdrawal Speed</td>
                  <td className="p-4 text-center">Standard (24h)</td>
                  <td className="p-4 text-center bg-blue-900/5 font-semibold">Priority (12h)</td>
                  <td className="p-4 text-center font-bold text-purple-300">Instant</td>
                </tr>
                <tr>
                  <td className="p-4 text-gray-300">Support</td>
                  <td className="p-4 text-center">Low priority</td>
                  <td className="p-4 text-center bg-blue-900/5 font-semibold">Priority 24/7</td>
                  <td className="p-4 text-center font-bold text-purple-300">High priority 24/7</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
