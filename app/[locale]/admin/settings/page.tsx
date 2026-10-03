'use client'

import { useCallback, useEffect, useState } from 'react'
import { Activity, Settings } from 'lucide-react'
import { useAdminRoute } from '@/lib/hooks'
import { getSystemStats } from '@/lib/admin'
import AdminLoading from '@/components/admin/AdminPageLoading'

interface SystemStats {
  newUsersLast30Days: number
  totalTransactionsLast30Days: number
  taskCompletionRate: string
}

export default function AdminSettingsPage() {
  const { isProtected } = useAdminRoute()
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSystemStats = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const stats = await getSystemStats()
      setSystemStats({
        newUsersLast30Days: Number(stats?.newUsersLast30Days || 0),
        totalTransactionsLast30Days: Number(stats?.totalTransactionsLast30Days || 0),
        taskCompletionRate: String(stats?.taskCompletionRate || '0'),
      })
    } catch (loadError) {
      console.error('Error loading system health stats:', loadError)
      setError('Failed to load system health. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isProtected) void loadSystemStats()
  }, [isProtected, loadSystemStats])

  const formatCompactCount = (value: number) => {
    if (value >= 1_000_000) return `${Number((value / 1_000_000).toFixed(1))}M`
    if (value >= 1_000) return `${Number((value / 1_000).toFixed(1))}K`
    return value.toLocaleString()
  }

  const formatRwfCompact = (value: number) => {
    if (value >= 1_000_000) return `${Number((value / 1_000_000).toFixed(1))}M RWF`
    if (value >= 1_000) return `${Number((value / 1_000).toFixed(1))}K RWF`
    return `${value.toLocaleString()} RWF`
  }

  if (loading) return <AdminLoading />

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-emerald-950 to-slate-900 py-8 text-white">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold">Platform Settings</h1>
          <p className="text-gray-300">Manage platform-wide settings and configuration.</p>
        </div>

        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <Settings className="mx-auto mb-4 h-10 w-10 text-emerald-400" />
          <h2 className="mb-2 text-xl font-semibold">Platform settings are coming soon</h2>
          <p className="text-gray-300">Platform-wide configuration options will be available here.</p>
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold">
            <Activity className="h-6 w-6" />
            System Health
          </h2>

          {error ? (
            <div role="alert" className="text-center">
              <p className="mb-4 text-red-300">{error}</p>
              <button
                onClick={loadSystemStats}
                className="rounded-lg bg-emerald-600 px-6 py-2 font-semibold transition-colors hover:bg-emerald-500"
              >
                Retry
              </button>
            </div>
          ) : systemStats && (
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <p className="mb-1 text-sm text-gray-400">New Users (Last 30 Days)</p>
                <p className="text-2xl font-bold text-blue-400">{formatCompactCount(systemStats.newUsersLast30Days)}</p>
              </div>
              <div>
                <p className="mb-1 text-sm text-gray-400">Transactions Volume</p>
                <p className="text-2xl font-bold text-emerald-400">{formatRwfCompact(systemStats.totalTransactionsLast30Days)}</p>
              </div>
              <div>
                <p className="mb-1 text-sm text-gray-400">Task Completion Rate</p>
                <p className="text-2xl font-bold text-yellow-400">{systemStats.taskCompletionRate}%</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
