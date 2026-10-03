'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { ExternalLink, TrendingUp, Users } from 'lucide-react'
import { useAdminRoute } from '@/lib/hooks'
import AdminLoading from '@/components/admin/AdminPageLoading'
import { supabase } from '@/lib/supabase-client'

interface InvestmentOverview {
  allMembers: number
  investorsRevenue: number
  pendingRequests: number
  vipPurchases: Record<string, number>
}

interface InvestorsPageProps {
  params: Promise<{ locale: string }>
}

const VIP_CODES = ['vip1', 'vip2', 'vip3', 'vip4', 'vip5', 'vip6']
const QUERY_PAGE_SIZE = 1000

export default function InvestorsPage({ params }: InvestorsPageProps) {
  const { locale } = use(params)
  const { isProtected } = useAdminRoute()
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [overview, setOverview] = useState<InvestmentOverview>({
    allMembers: 0,
    investorsRevenue: 0,
    pendingRequests: 0,
    vipPurchases: Object.fromEntries(VIP_CODES.map((code) => [code, 0])),
  })

  const loadOverview = useCallback(async () => {
    if (!isProtected) return

    setLoading(true)
    setErrorMessage(null)
    try {
      const [membersResult, pendingResult] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase
          .from('product_purchase_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
      ])

      if (membersResult.error) throw membersResult.error
      if (pendingResult.error) throw pendingResult.error

      let investorsRevenue = 0
      const vipPurchases = Object.fromEntries(VIP_CODES.map((code) => [code, 0]))

      for (let offset = 0; ; offset += QUERY_PAGE_SIZE) {
        const { data, error } = await supabase
          .from('product_purchase_requests')
          .select('product_code, purchase_price')
          .eq('status', 'approved')
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(offset, offset + QUERY_PAGE_SIZE - 1)

        if (error) throw error

        const purchases = data || []
        for (const purchase of purchases) {
          investorsRevenue += Number(purchase.purchase_price) || 0
          if (purchase.product_code in vipPurchases) {
            vipPurchases[purchase.product_code] += 1
          }
        }

        if (purchases.length < QUERY_PAGE_SIZE) break
      }

      setOverview({
        allMembers: membersResult.count || 0,
        investorsRevenue,
        pendingRequests: pendingResult.count || 0,
        vipPurchases,
      })
    } catch (error) {
      console.error('Error loading investment overview:', error)
      setErrorMessage('Unable to load the investment overview. Please try again later.')
    } finally {
      setLoading(false)
    }
  }, [isProtected])

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  if (loading) return <AdminLoading />

  const formatRwf = (amount: number) => `${amount.toLocaleString('en-GB')} RWF`

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-900 via-emerald-950 to-slate-900 py-8 text-white">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="mb-2 text-4xl font-bold">Investment Management</h1>
            <p className="text-gray-300">Overview of members and product investment performance.</p>
          </div>
          <a
            href={`/${locale}/admin/investors/invest-request`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-emerald-500"
          >
            <span>Pending Requests</span>
            <span
              aria-label={`${overview.pendingRequests} pending requests`}
              className="inline-flex min-w-6 items-center justify-center rounded-full bg-orange-500 px-2 py-0.5 text-sm"
            >
              {overview.pendingRequests}
            </span>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>

        {errorMessage && (
          <div role="alert" className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-red-300">
            {errorMessage}
          </div>
        )}

        <div className="mb-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-300">All Members</h2>
              <Users className="h-5 w-5 text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-white">
              {errorMessage ? '—' : overview.allMembers.toLocaleString('en-GB')}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-300">Investors Revenue</h2>
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="text-3xl font-bold text-white">
              {errorMessage ? '—' : formatRwf(overview.investorsRevenue)}
            </p>
          </div>
          {VIP_CODES.map((code, index) => (
            <div key={code} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="mb-2 text-sm font-semibold text-gray-300">VIP-{index + 1} Units</h2>
              <p className="text-3xl font-bold text-purple-400">
                {errorMessage ? '—' : overview.vipPurchases[code].toLocaleString('en-GB')}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}