"use client"

import { use, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useAdminRoute } from '@/lib/hooks'
import { getSystemStats, getFraudLogs } from '@/lib/admin'
import { getReferralLeaderboard } from '@/lib/referral'
import AdminLoading from '@/components/admin/AdminPageLoading'
import { TrendingUp, Users, Briefcase, DollarSign, Activity, Trophy } from 'lucide-react'
import ReferralLeaderboard from '@/components/dashboard/ReferralLeaderboard'
import supabase from '@/lib/supabaseClient'

interface AdminDashboardProps {
  params: Promise<{ locale: string }>
}

interface DashboardStats {
  totalUsers?: number
  activeUsers?: number
  totalDistributed?: number
  totalPayouts?: number
  activeTasks?: number
}

interface SystemStats {
  newUsersLast30Days?: number
  totalTransactionsLast30Days?: number
  taskCompletionRate?: number
}

interface LeaderboardEntry {
  user_id: string
  full_name: string
  referral_count: number
}

interface RecentFraudLog {
  id: string
  users?: { full_name?: string; email?: string }
  fraud_type?: string
  severity?: string
  description?: string
  created_at?: string
}

export default function AdminDashboard({ params }: AdminDashboardProps) {
  const { locale } = use(params)
  const { isProtected } = useAdminRoute()
  const [loading, setLoading] = useState<boolean>(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const [recentFraudLogs, setRecentFraudLogs] = useState<RecentFraudLog[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showLeaderboardModal, setShowLeaderboardModal] = useState<boolean>(false)

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

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsRes, sysStats, { logs }, leaderboardData] = await Promise.all([
        supabase.rpc('get_admin_dashboard_stats'),
        getSystemStats(),
        getFraudLogs(5),
        getReferralLeaderboard(5),
      ])

      if (statsRes.error) throw statsRes.error
      const dashboardStats = statsRes.data?.[0]

      setStats({
        totalUsers: Number(dashboardStats?.total_users || 0),
        activeUsers: Number(dashboardStats?.active_users || 0),
        totalDistributed: Number(dashboardStats?.total_distributed || 0),
        totalPayouts: Number(dashboardStats?.total_payouts || 0),
        activeTasks: Number(dashboardStats?.active_tasks || 0),
      })

      setSystemStats({
        newUsersLast30Days: Number(sysStats?.newUsersLast30Days || 0),
        totalTransactionsLast30Days: Number(sysStats?.totalTransactionsLast30Days || 0),
        taskCompletionRate: Number(sysStats?.taskCompletionRate || 0),
      })
      setRecentFraudLogs((logs || []) as RecentFraudLog[])
      setLeaderboard((leaderboardData || []) as LeaderboardEntry[])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setError('Failed to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, []) // No dependencies needed here if all fetched data is set via state setters

  useEffect(() => {
    if (!isProtected) return
    loadData()
  }, [isProtected, loadData])

  if (loading) {
    return <AdminLoading />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-emerald-950 to-slate-900 text-white py-8">
        <div className="container mx-auto px-4 max-w-7xl text-center">
          <div className="p-8 rounded-2xl bg-red-900/20 border border-red-500/30">
            <h2 className="text-2xl font-bold text-red-400 mb-4">An Error Occurred</h2>
            <p className="text-gray-300 mb-6">{error}</p>
            <button
              onClick={loadData}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors font-semibold"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-emerald-950 to-slate-900 text-white py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-gray-300">Platform overview and management</p>
        </div>

        {/* Key Statistics Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300">Total Users</h3>
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-white">{formatCompactCount(Number(stats?.totalUsers || 0))}</p>
            <p className="text-xs text-gray-400 mt-2">
              {formatCompactCount(Number(stats?.activeUsers || 0))} active | {((Number(stats?.activeUsers || 0) / Math.max(Number(stats?.totalUsers || 0), 1)) * 100).toFixed(1)}%
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300">Distributed</h3>
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-3xl font-bold text-white">{formatRwfCompact(Number(stats?.totalDistributed || 0))}</p>
            <p className="text-xs text-gray-400 mt-2">Total rewards given</p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300">Paid Out</h3>
              <DollarSign className="w-5 h-5 text-yellow-400" />
            </div>
            <p className="text-3xl font-bold text-white">{formatRwfCompact(Number(stats?.totalPayouts || 0))}</p>
            <p className="text-xs text-gray-400 mt-2">
              {((Number(stats?.totalPayouts || 0) / Math.max(Number(stats?.totalDistributed || 0), 1)) * 100).toFixed(1)}% payout rate
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300">Active Tasks</h3>
              <Briefcase className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-3xl font-bold text-white">{formatCompactCount(Number(stats?.activeTasks || 0))}</p>
            <p className="text-xs text-gray-400 mt-2">Running tasks</p>
          </div>
        </div>

        {/* Quick Action Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="p-8 rounded-2xl bg-white/5 border border-white/10">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Activity className="w-6 h-6" />
              System Health
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm mb-1">New Users (Last 30 Days)</p>
                <p className="text-2xl font-bold text-blue-400">{formatCompactCount(Number(systemStats?.newUsersLast30Days || 0))}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Transactions Volume</p>
                <p className="text-2xl font-bold text-emerald-400">{formatRwfCompact(Number(systemStats?.totalTransactionsLast30Days || 0))}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Task Completion Rate</p>
                <p className="text-2xl font-bold text-yellow-400">{systemStats?.taskCompletionRate}%</p>
              </div>
            </div>
          </div>

          <div className="p-8 rounded-2xl bg-white/5 border border-white/10">
            <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4">
              <Link
                href={`/${locale}/admin/users`}
                className="p-4 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors text-center font-semibold"
              >
                Manage Users
              </Link>
              <Link
                href={`/${locale}/admin/tasks`}
                className="p-4 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors text-center font-semibold"
              >
                Manage Tasks
              </Link>
              <Link
                href={`/${locale}/admin/withdrawals`}
                className="p-4 bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors text-center font-semibold"
              >
                Withdrawals
              </Link>
              <Link
                href={`/${locale}/admin/fraud`}
                className="p-4 bg-red-600 hover:bg-red-500 rounded-lg transition-colors text-center font-semibold"
              >
                Fraud Logs
              </Link>
            </div>
          </div>
        </div>

        {/* Referral Leaderboard */}
        <div className="p-8 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-400" />
              Top Referrers
            </h2>
            <button
              onClick={() => setShowLeaderboardModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors text-sm font-semibold"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {leaderboard.length > 0 ? (
              leaderboard.map((user, index) => (
                <div key={user.user_id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-400 w-5 text-center">{index + 1}</span>
                    <span className="font-medium text-white">{user.full_name || 'Anonymous'}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-lg text-emerald-400">{user.referral_count}</span>
                    <span className="text-xs text-gray-500 ml-1">referrals</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No referral data available yet.</p>
            )}
          </div>
        </div>
      </div>
      <ReferralLeaderboard
        isOpen={showLeaderboardModal}
        onClose={() => setShowLeaderboardModal(false)}
      />
    </div>
  )
}
