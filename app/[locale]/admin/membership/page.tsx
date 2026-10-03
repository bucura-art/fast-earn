"use client"

import { useState, useEffect, use } from 'react'
import { useAdminRoute } from '@/lib/hooks'
import { getAllSubscriptions } from '@/lib/admin'
import AdminLoading from '@/components/admin/AdminPageLoading'
import { ExternalLink, TrendingUp, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'

interface SubscriptionManagementProps {
  params: Promise<{ locale: string }>
}

export default function SubscriptionManagementPage({ params }: SubscriptionManagementProps) {
  const { locale } = use(params)
  const { isProtected } = useAdminRoute()
  const [loading, setLoading] = useState(true)
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [pendingRequestCount, setPendingRequestCount] = useState(0)
  const [stats, setStats] = useState({
    totalSubscribers: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    tierBreakdown: { free: 0, pro: 0, pro_max: 0 },
  })
  const [tierPrices, setTierPrices] = useState<Record<string, number>>({ free: 0, pro: 6000, pro_max: 12000 })

  useEffect(() => {
    if (!isProtected) return

    const loadSubscriptions = async () => {
      try {
        // Fetch current tier prices from database
        const { data: tiersData } = await supabase.from('tiers').select('name, monthly_price')
        const currentPrices: Record<string, number> = { free: 0 }
        if (tiersData) {
          tiersData.forEach((t) => {
            if (t.name) currentPrices[t.name] = t.monthly_price
          })
          setTierPrices((prev) => ({ ...prev, ...currentPrices }))
        }

        const { subscriptions: fetchedSubs, total: totalCount } = await getAllSubscriptions(50, page * 50, {
          excludeFree: true,
        })

        setSubscriptions(fetchedSubs)
        setTotal(totalCount)

        // Calculate statistics
        const activeCount = fetchedSubs.filter((s: any) => s.status === 'active').length
        const tierCounts = { free: 0, pro: 0, pro_max: 0 }

        fetchedSubs.forEach((sub: any) => {
          const tier = sub.tiers?.name || 'free'
          if (tier in tierCounts) {
            tierCounts[tier as keyof typeof tierCounts]++
          }
        })

        const { data: incomeData, error: incomeError } = await supabase.rpc('get_admin_dashboard_income_stats')
        if (incomeError) throw incomeError
        const totalMembershipRevenue = Number(incomeData?.[0]?.membership_income ?? 0)

        setStats({
          totalSubscribers: totalCount,
          activeSubscriptions: activeCount,
          totalRevenue: totalMembershipRevenue,
          tierBreakdown: tierCounts,
        })
      } catch (error) {
        console.error('Error loading subscriptions:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSubscriptions()
  }, [isProtected, page])

  useEffect(() => {
    if (!isProtected) return

    const loadPendingRequestCount = async () => {
      const { count, error } = await supabase
        .from('upgrade_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')

      if (error) {
        console.error('Error loading pending upgrade request count:', error)
        return
      }

      setPendingRequestCount(count ?? 0)
    }

    void loadPendingRequestCount()
  }, [isProtected])

  if (loading) {
    return <AdminLoading />
  }

  const formatRevenue = (amount: number) => {
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M RWF`
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K RWF`
    return `${amount.toLocaleString()} RWF`
  }

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(date))

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-900 via-emerald-950 to-slate-900 text-white py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="sticky top-0 z-20 -mx-4 mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-white/10 bg-slate-900/95 px-4 py-4 backdrop-blur">
          <div>
            <h1 className="text-4xl uppercase font-bold mb-2">Membership Management</h1>
          </div>
          <a
            href={`/${locale}/admin/upgrades`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-emerald-500"
          >
            <span>Pending Requests</span>
            <span
              aria-label={`${pendingRequestCount} pending requests`}
              className="inline-flex min-w-6 items-center justify-center rounded-full bg-orange-500 px-2 py-0.5 text-sm"
            >
              {pendingRequestCount}
            </span>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>

        {/* Statistics Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {/* All-Time Members */}
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300">All Members</h3>
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-white">{stats.totalSubscribers}</p>
          </div>

          {/* All-Time Revenue */}
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300">Total Income</h3>
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-3xl font-bold text-white">{formatRevenue(stats.totalRevenue)}</p>
          </div>

          {/* Pro Users */}
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Pro Members</h3>
            <p className="text-3xl font-bold text-yellow-400">{stats.tierBreakdown.pro}</p>
          </div>

          {/* Pro Max Users */}
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Pro Max Members</h3>
            <p className="text-3xl font-bold text-purple-400">{stats.tierBreakdown.pro_max}</p>
          </div>
        </div>

        {/* Recent Memberships */}
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-2xl font-bold">Recent Memberships</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="text-left py-4 px-6 font-semibold">Names</th>
                  <th className="text-left py-4 px-6 font-semibold">Tier</th>
                  <th className="text-left py-4 px-6 font-semibold">Status</th>
                  <th className="text-left py-4 px-6 font-semibold">Start Date</th>
                  <th className="text-left py-4 px-6 font-semibold">End Date</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.length > 0 ? (
                  subscriptions.map((sub: any) => (
                    <tr key={sub.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-4 px-6">
                        <p className="font-semibold">{sub.users?.full_name}</p>
                        <span className="text-gray-400 text-xs block">{sub.users?.email}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2 py-1 bg-purple-900/40 text-purple-400 rounded text-xs font-semibold">
                          {sub.tiers?.name?.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            sub.status === 'active'
                              ? 'bg-green-900/40 text-green-400'
                              : 'bg-gray-900/40 text-gray-400'
                          }`}
                        >
                          {sub.status?.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-400">
                        {formatDate(sub.start_date)}
                      </td>
                      <td className="py-4 px-6 text-gray-400">
                        {sub.end_date ? formatDate(sub.end_date) : '∞ Ongoing'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">
                      No memberships found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-6 border-t border-white/10">
            <p className="text-sm text-gray-400">
              Showing {Math.min((page + 1) * 50, total)} of {total} memberships
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={(page + 1) * 50 >= total}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
