"use client"

import { useEffect, useState, useCallback } from 'react'
import { useAdminRoute } from '@/lib/hooks'
import { TrendingUp, Users, Briefcase, DollarSign, Gift, CheckSquare, Package } from 'lucide-react'
import TheTopEarners from '@/components/admin/TheTopEarners'
import ReferralLeaderboard from '@/components/dashboard/ReferralLeaderboard'
import supabase from '@/lib/supabaseClient'

interface PerformanceStats {
  totalUsers: number
  activeUsers: number
  paidUsers: number
  activeTasks: number
  activeProducts: number
}

interface PayoutStats {
  totalUserBalance: number
  totalBonus: number
  totalRewards: number
  totalProductRoi: number
  totalPaidOut: number
}

interface IncomeStats {
  totalMembers: number
  totalInvestors: number
  membershipIncome: number
  productIncome: number
}

interface SectionState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export default function AdminDashboard() {
  const { isProtected } = useAdminRoute()
  const [performance, setPerformance] = useState<SectionState<PerformanceStats>>({
    data: null,
    loading: true,
    error: null,
  })
  const [payout, setPayout] = useState<SectionState<PayoutStats>>({
    data: null,
    loading: true,
    error: null,
  })
  const [income, setIncome] = useState<SectionState<IncomeStats>>({
    data: null,
    loading: true,
    error: null,
  })

  const formatCompactCount = (value: number) => {
    const amount = Number(value || 0)

    if (amount >= 1_000_000) return `${Number((amount / 1_000_000).toFixed(1))}M`
    if (amount >= 1_000) return `${Number((amount / 1_000).toFixed(1))}K`

    return amount.toLocaleString()
  }

  const formatRwfCompact = (value: number) => {
    const amount = Number(value || 0)

    if (amount >= 1_000_000) return `${Number((amount / 1_000_000).toFixed(1))}M RWF`
    if (amount >= 1_000) return `${Number((amount / 1_000).toFixed(1))}K RWF`

    return `${amount.toLocaleString()} RWF`
  }

  const loadPerformance = useCallback(async () => {
    setPerformance((previous) => ({ ...previous, loading: true, error: null }))
    try {
      const { data, error } = await supabase.rpc('get_admin_dashboard_performance_stats')
      if (error) throw error
      const result = data?.[0]
      if (!result) throw new Error('Performance endpoint returned no data')

      setPerformance({
        data: {
          totalUsers: Number(result.total_users),
          activeUsers: Number(result.active_users),
          paidUsers: Number(result.paid_users),
          activeTasks: Number(result.active_tasks),
          activeProducts: Number(result.active_products),
        },
        loading: false,
        error: null,
      })
    } catch (error) {
      console.error('Error loading performance stats:', error)
      setPerformance((previous) => ({
        ...previous,
        loading: false,
        error: 'Failed to load performance stats.',
      }))
    }
  }, [])

  const loadPayout = useCallback(async () => {
    setPayout((previous) => ({ ...previous, loading: true, error: null }))
    try {
      const { data, error } = await supabase.rpc('get_admin_dashboard_payout_stats')
      if (error) throw error
      const result = data?.[0]
      if (!result) throw new Error('Payout endpoint returned no data')

      setPayout({
        data: {
          totalUserBalance: Number(result.total_user_balance),
          totalBonus: Number(result.total_bonus),
          totalRewards: Number(result.total_rewards),
          totalProductRoi: Number(result.total_product_roi),
          totalPaidOut: Number(result.total_paid_out),
        },
        loading: false,
        error: null,
      })
    } catch (error) {
      console.error('Error loading payout stats:', error)
      setPayout((previous) => ({
        ...previous,
        loading: false,
        error: 'Failed to load payout stats.',
      }))
    }
  }, [])

  const loadIncome = useCallback(async () => {
    setIncome((previous) => ({ ...previous, loading: true, error: null }))
    try {
      const { data, error } = await supabase.rpc('get_admin_dashboard_income_stats')
      if (error) throw error
      const result = data?.[0]
      if (!result) throw new Error('Income endpoint returned no data')

      setIncome({
        data: {
          totalMembers: Number(result.total_members),
          totalInvestors: Number(result.total_investors),
          membershipIncome: Number(result.membership_income),
          productIncome: Number(result.product_income),
        },
        loading: false,
        error: null,
      })
    } catch (error) {
      console.error('Error loading income stats:', error)
      setIncome((previous) => ({
        ...previous,
        loading: false,
        error: 'Failed to load income stats.',
      }))
    }
  }, [])

  useEffect(() => {
    if (!isProtected) return
    void loadPerformance()
    void loadPayout()
    void loadIncome()
  }, [isProtected, loadPerformance, loadPayout, loadIncome])

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-900 via-emerald-950 to-slate-900 text-white py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="sticky top-0 z-20 mb-8 -mx-4 bg-slate-900/80 px-4 pb-3 pt-2 backdrop-blur-sm border-b border-emerald-500/30">
          <h1 className="text-4xl font-bold">Admin Dashboard</h1>
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-3">
          {/* Performance section */}
          <section aria-labelledby="performance-heading" className="rounded-2xl border border-emerald-500/40 bg-slate-900/30 p-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 id="performance-heading" className="text-xl font-bold">Performance</h2>
            <p className="text-right text-xs text-gray-300">
              <span className="font-semibold text-emerald-400">{performance.data ? formatCompactCount(performance.data.totalUsers) : '—'} Users</span>
            </p>
          </div>
          {performance.loading && !performance.data && <p className="mb-3 text-xs text-gray-400">Loading performance...</p>}
          {performance.error && (
            <div role="alert" className="mb-3 flex items-center justify-between gap-2 text-xs text-red-300">
              <span>{performance.error}</span>
              <button type="button" onClick={loadPerformance} className="font-semibold underline">Retry</button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/20">
              <div className="relative mb-3 flex justify-start">
                {/* Last seen this week */}
                <h3 className="text-left text-xs font-semibold text-gray-300">Active Users</h3>
                <Users className="absolute right-0 h-4 w-4 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-white">{performance.data ? formatCompactCount(performance.data.activeUsers) : '—'}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/20">
              <div className="relative mb-3 flex justify-start">
                {/*Whoever paid anything and get approved */}
                <h3 className="text-left text-xs font-semibold text-gray-300">Who paid</h3>
                <CheckSquare className="absolute right-0 h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-white">{performance.data ? formatCompactCount(performance.data.paidUsers) : '—'}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/20">
              <div className="relative mb-3 flex justify-start">
                {/* Currently running tasks */}
                <h3 className="text-left text-xs font-semibold text-gray-300">Active Tasks</h3>
                <Briefcase className="absolute right-0 h-4 w-4 text-purple-400" />
              </div>
              <p className="text-2xl font-bold text-white">{performance.data ? formatCompactCount(performance.data.activeTasks) : '—'}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/20">
              <div className="relative mb-3 flex justify-start">
                {/*Active Products */}
                <h3 className="text-left text-xs font-semibold text-gray-300">Active Products</h3>
                <Package className="absolute right-0 h-4 w-4 text-indigo-300" />
              </div>
              <p className="text-2xl font-bold text-white">{performance.data ? formatCompactCount(performance.data.activeProducts) : '—'}</p>
            </div>
          </div>
          </section>

          {/* Payout section */}
          <section aria-labelledby="payout-heading" className="rounded-2xl border border-emerald-500/40 bg-slate-900/30 p-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 id="payout-heading" className="text-xl font-bold">Payout</h2>
            <p className="text-right text-xs text-gray-300">
              <span className="font-semibold text-orange-400">{payout.data ? formatRwfCompact(payout.data.totalUserBalance) : '— RWF'}</span>
            </p>
          </div>
          {payout.loading && !payout.data && <p className="mb-3 text-xs text-gray-400">Loading payout...</p>}
          {payout.error && (
            <div role="alert" className="mb-3 flex items-center justify-between gap-2 text-xs text-red-300">
              <span>{payout.error}</span>
              <button type="button" onClick={loadPayout} className="font-semibold underline">Retry</button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/20">
              <div className="relative mb-3 flex justify-start">
                {/* Welcome and checkin bonuses */}
                <h3 className="text-left text-xs font-semibold text-gray-300">Total Bonus</h3>
                <Gift className="absolute right-0 h-4 w-4 text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-white">{payout.data ? formatRwfCompact(payout.data.totalBonus) : '— RWF'}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/20">
              <div className="relative mb-3 flex justify-start">
                {/* Videos and other tasks rewards */}
                <h3 className="text-left text-xs font-semibold text-gray-300">Tasks Rewards</h3>
                <CheckSquare className="absolute right-0 h-4 w-4 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-white">{payout.data ? formatRwfCompact(payout.data.totalRewards) : '— RWF'}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/20">
              <div className="relative mb-3 flex justify-start">
                {/* Credited product income*/}
                <h3 className="text-left text-xs font-semibold text-gray-300">Products ROI</h3>
                <Package className="absolute right-0 h-4 w-4 text-indigo-300" />
              </div>
              <p className="text-2xl font-bold text-white">{payout.data ? formatRwfCompact(payout.data.totalProductRoi) : '— RWF'}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/20">
              <div className="relative mb-3 flex justify-start">
                {/* Approved payouts*/}
                <h3 className="text-left text-xs font-semibold text-gray-300">Distributed</h3>
                <DollarSign className="absolute right-0 h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-white">{payout.data ? formatRwfCompact(payout.data.totalPaidOut) : '— RWF'}</p>
            </div>
          </div>
          </section>

          {/* Income section */}
          <section aria-labelledby="income-heading" className="rounded-2xl border border-emerald-500/40 bg-slate-900/30 p-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 id="income-heading" className="text-xl font-bold">Income</h2>
            <p className="text-right text-xs text-gray-300">
              <span className="font-semibold text-emerald-400">
                {income.data ? formatRwfCompact(income.data.membershipIncome + income.data.productIncome) : '— RWF'}
              </span>
            </p>
          </div>
          {income.loading && !income.data && <p className="mb-3 text-xs text-gray-400">Loading income...</p>}
          {income.error && (
            <div role="alert" className="mb-3 flex items-center justify-between gap-2 text-xs text-red-300">
              <span>{income.error}</span>
              <button type="button" onClick={loadIncome} className="font-semibold underline">Retry</button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/20">
              <div className="relative mb-3 flex justify-start">
                <h3 className="text-left text-xs font-semibold text-gray-300">Total Members</h3>
                <Users className="absolute right-0 h-4 w-4 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-white">{income.data ? formatCompactCount(income.data.totalMembers) : '—'}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/20">
              <div className="relative mb-3 flex justify-start">
                <h3 className="text-left text-xs font-semibold text-gray-300">Total Investors</h3>
                <Briefcase className="absolute right-0 h-4 w-4 text-purple-400" />
              </div>
              <p className="text-2xl font-bold text-white">{income.data ? formatCompactCount(income.data.totalInvestors) : '—'}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/20">
              <div className="relative mb-3 flex justify-start">
                <h3 className="text-left text-xs font-semibold text-gray-300">Membership</h3>
                <DollarSign className="absolute right-0 h-4 w-4 text-yellow-400" />
              </div>
              <p className="text-2xl font-bold text-white">{income.data ? formatRwfCompact(income.data.membershipIncome) : '— RWF'}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/20">
              <div className="relative mb-3 flex justify-start">
                <h3 className="text-left text-xs font-semibold text-gray-300">Products</h3>
                <TrendingUp className="absolute right-0 h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-white">{income.data ? formatRwfCompact(income.data.productIncome) : '— RWF'}</p>
            </div>
          </div>
          </section>
        </div>

      </div>
      <div className="container mx-auto mt-8 grid max-w-7xl gap-6 px-4 lg:grid-cols-2">
        <TheTopEarners />
        <ReferralLeaderboard />
      </div>
    </div>
  )
}
