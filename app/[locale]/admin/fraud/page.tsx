'use client'

import { useState, useEffect, use } from 'react'
import { useAdminRoute } from '@/lib/hooks'
import { getFraudLogs } from '@/lib/admin'
import AdminLoading from '@/components/admin/AdminPageLoading'
import { AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react'

interface FraudManagementProps {
  params: Promise<{ locale: string }>
}

type Severity = 'low' | 'medium' | 'high' | 'critical' | string

interface FraudUser {
  full_name?: string
  email?: string
}

interface FraudLog {
  id: string
  user_id?: string
  users?: FraudUser
  fraud_type?: string
  severity?: Severity
  description?: string
  action_taken?: string
  created_at?: string
}

interface FraudStats {
  totalFraudCases: number
  criticalCases: number
  highRiskCases: number
  detectionRate: string
}

export default function FraudManagementPage({ params }: FraudManagementProps) {
  const { locale } = use(params)
  const { isProtected } = useAdminRoute()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<FraudLog[]>([])
  const [total, setTotal] = useState<number>(0)
  const [page, setPage] = useState(0)
  const [stats, setStats] = useState<FraudStats>({
    totalFraudCases: 0,
    criticalCases: 0,
    highRiskCases: 0,
    detectionRate: '0.00',
  })

  const loadFraudLogs = async () => {
    setLoading(true)
    try {
      const res = await getFraudLogs(50, page * 50)
      const fetchedLogs = (res.logs || []) as FraudLog[]
      const totalCount = (res.total as number) || fetchedLogs.length

      setLogs(fetchedLogs)
      setTotal(totalCount)

      // Calculate stats based on FETCHED logs (Recent)
      // Note: This is only for the current page/batch to avoid misleading "0" counts if criticals are on page 2
      const severityCount = fetchedLogs.reduce((acc: Record<string, number>, log: FraudLog) => {
        const sev = (log.severity || 'unknown') as string
        acc[sev] = (acc[sev] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const criticalCount = severityCount['critical'] || 0
      const highCount = severityCount['high'] || 0

      setStats({
        totalFraudCases: totalCount,
        criticalCases: criticalCount,
        highRiskCases: highCount,
        detectionRate: ((totalCount / Math.max(totalCount + 1000, 1)) * 100).toFixed(2),
      })
    } catch (error) {
      console.error('Error loading fraud logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isProtected) return
    loadFraudLogs()
  }, [isProtected, page])

  if (loading) {
    return <AdminLoading />
  }

  const severityColors: Record<string, string> = {
    critical: 'bg-red-900/40 text-red-400 border-red-500/50',
    high: 'bg-orange-900/40 text-orange-400 border-orange-500/50',
    medium: 'bg-yellow-900/40 text-yellow-400 border-yellow-500/50',
    low: 'bg-blue-900/40 text-blue-400 border-blue-500/50',
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-emerald-950 to-slate-900 text-white py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-8 h-8" />
            Fraud Detection & Prevention
          </h1>
          <p className="text-gray-300 mb-6">Monitor suspicious activities and fraud cases ({locale || 'en'})</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {/* Total Cases */}
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300">Total Cases</h3>
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-3xl font-bold text-white">{stats.totalFraudCases || 0}</p>
          </div>

          {/* Critical Cases */}
          <div className="p-6 rounded-2xl bg-white/5 border border-red-500/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300">Recent Critical 🚨</h3>
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            </div>
            <p className="text-3xl font-bold text-red-400">{stats.criticalCases || 0}</p>
          </div>

          {/* High Risk */}
          <div className="p-6 rounded-2xl bg-white/5 border border-orange-500/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300">Recent High Risk ⚠️</h3>
              <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
            </div>
            <p className="text-3xl font-bold text-orange-400">{stats.highRiskCases || 0}</p>
          </div>

          {/* Detection Rate */}
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300">Detection Rate</h3>
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-3xl font-bold text-emerald-400">{stats.detectionRate}%</p>
          </div>
        </div>

        {/* Actions */}
        <div className="mb-8 flex justify-end">
          <button
            onClick={() => loadFraudLogs()}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm font-semibold"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Logs
          </button>
        </div>

        {/* Fraud Logs Table */}
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="text-left py-4 px-6 font-semibold">User</th>
                  <th className="text-left py-4 px-6 font-semibold">Fraud Type</th>
                  <th className="text-left py-4 px-6 font-semibold">Severity</th>
                  <th className="text-left py-4 px-6 font-semibold">Description</th>
                  <th className="text-left py-4 px-6 font-semibold">Action Taken</th>
                  <th className="text-left py-4 px-6 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {logs.length > 0 ? (
                  logs.map((log: FraudLog) => (
                    <tr key={String(log.id)} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-4 px-6">
                        <p className="font-semibold">{log.users?.full_name || '—'}</p>
                        <p className="text-gray-400 text-xs">{log.users?.email || ''}</p>
                      </td>
                      <td className="py-4 px-6 text-gray-300">{log.fraud_type || ''}</td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold border ${
                            severityColors[String(log.severity) || 'low'] || severityColors.low
                          }`}
                        >
                          {(String(log.severity) || 'low').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-400 max-w-xs">{log.description || ''}</td>
                      <td className="py-4 px-6">
                        <span className="text-sm">
                          {log.action_taken ? (
                            <span className="text-emerald-400 bg-emerald-900/30 px-2 py-1 rounded">{log.action_taken}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-400">
                        {log.created_at ? new Date(String(log.created_at)).toLocaleDateString() : '—'}{' '}
                        {log.created_at ? new Date(String(log.created_at)).toLocaleTimeString() : ''}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      No fraud logs found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-6 border-t border-white/10">
            <p className="text-sm text-gray-400">
              Showing {Math.min((page + 1) * 50, total)} of {total} cases
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

        {/* Info Box */}
        <div className="mt-8 p-6 rounded-2xl bg-blue-900/20 border border-blue-500/30">
          <h3 className="font-bold mb-2 flex items-center gap-2">
            <span className="text-lg">ℹ️</span> Fraud Detection System
          </h3>
          <p className="text-lg text-white">
            The system automatically logs suspicious activities including:
            <br />
            • Multiple failed login attempts
            <br />
            • IP address variations
            <br />
            • Device fingerprint spoofing
            <br />
            • Unusual task completion patterns
            <br />
            • Rapid withdrawal requests
            <br />
            • Bot detection signals
            <br />
            Critical cases automatically trigger account suspension for investigation.
          </p>
        </div>
      </div>
    </div>
  )
}
