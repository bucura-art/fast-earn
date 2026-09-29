"use client"

import { use, useEffect, useState } from 'react'
import { useAdminRoute } from '@/lib/hooks'
import { approveWithdrawal, rejectWithdrawal } from '@/lib/admin'
import { getCurrentUser } from '@/lib/auth'
import AdminLoading from '@/components/admin/AdminPageLoading'
import { Check, X } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

interface WithdrawalManagementProps {
  params: Promise<{ locale: string }>
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function WithdrawalManagementPage({ params }: WithdrawalManagementProps) {
  const { locale } = use(params)
  const { isProtected } = useAdminRoute()

  const [loading, setLoading] = useState(true)
  const [adminId, setAdminId] = useState<string>('')

  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [filterStatus, setFilterStatus] = useState<string>('pending')
  const [filterMethod, setFilterMethod] = useState<string>('')

  const [actionLoading, setActionLoading] = useState<string>('')
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({})
  const [showRejectForm, setShowRejectForm] = useState<string | null>(null)

  const formatRwfCompact = (value: number) => {
    const amount = Number(value || 0)
    if (amount >= 1_000_000) return `${Number((amount / 1_000_000).toFixed(1))}M RWF`
    if (amount >= 1_000) return `${Number((amount / 1_000).toFixed(1))}K RWF`
    return `${amount.toLocaleString()} RWF`
  }

  useEffect(() => {
    if (!isProtected) return

    const loadData = async () => {
      try {
        const currentUser = await getCurrentUser()
        if (currentUser) setAdminId(currentUser.id)

        let query = supabase
          .from('withdrawals')
          .select('*, users!withdrawals_user_id_fkey(full_name, email)', { count: 'exact' })
          .range(page * 50, (page + 1) * 50 - 1)
          .order('created_at', { ascending: false })

        if (filterStatus) query = query.eq('status', filterStatus)
        if (filterMethod) query = query.eq('method', filterMethod)

        const { data, count, error } = await query

        if (error) throw error

        setWithdrawals(data || [])
        setTotal(count || 0)
      } catch (error) {
        console.error('Error loading withdrawals:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [isProtected, page, filterStatus, filterMethod])

  const handleApproveWithdrawal = async (withdrawalId: string) => {
    setActionLoading(`withdraw-${withdrawalId}`)
    try {
      await approveWithdrawal(withdrawalId, adminId)
      setWithdrawals((prev) => prev.map((w) => (w.id === withdrawalId ? { ...w, status: 'approved' } : w)))
    } catch (error) {
      console.error('Error approving withdrawal:', error)
    } finally {
      setActionLoading('')
    }
  }

  const handleRejectWithdrawal = async (withdrawalId: string) => {
    const reason = rejectNotes[withdrawalId] || 'Rejected by admin'
    setActionLoading(`withdraw-${withdrawalId}`)
    try {
      await rejectWithdrawal(withdrawalId, adminId, reason)
      setWithdrawals((prev) => prev.map((w) => (w.id === withdrawalId ? { ...w, status: 'rejected' } : w)))
      setShowRejectForm(null)
      setRejectNotes((prev) => {
        const next = { ...prev }
        delete next[withdrawalId]
        return next
      })
    } catch (error) {
      console.error('Error rejecting withdrawal:', error)
    } finally {
      setActionLoading('')
    }
  }

  const handleMarkAsPaid = async (withdrawalId: string) => {
    setActionLoading(`withdraw-${withdrawalId}`)
    try {
      const { error } = await supabase
        .from('withdrawals')
        .update({ status: 'paid', processed_at: new Date().toISOString() })
        .eq('id', withdrawalId)

      if (error) throw error
      setWithdrawals((prev) => prev.map((w) => (w.id === withdrawalId ? { ...w, status: 'paid' } : w)))
    } catch (error) {
      console.error('Error marking withdrawal as paid:', error)
    } finally {
      setActionLoading('')
    }
  }

  if (loading) {
    return <AdminLoading />
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-900/40 text-yellow-400',
    approved: 'bg-green-900/40 text-green-400',
    rejected: 'bg-red-900/40 text-red-400',
    paid: 'bg-emerald-900/40 text-emerald-400',
  }

  const methodLabels: Record<string, string> = {
    mtn: 'MTN Mobile Money',
    airtel: 'Airtel Money',
    bank: 'Bank Transfer',
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-emerald-950 to-slate-900 text-white py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-4">Withdrawal Requests</h1>
            <p className="text-gray-300">Manage user withdrawal requests.</p>
          </div>
        </div>

        {/* Withdrawal Filters */}
        <div className="mb-6 grid md:grid-cols-3 gap-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-slate-900 border border-white/20 rounded-lg text-white"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="paid">Paid</option>
          </select>

          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="px-4 py-2 bg-slate-900 border border-white/20 rounded-lg text-white"
          >
            <option value="">All Methods</option>
            <option value="mtn">MTN Mobile Money</option>
            <option value="airtel">Airtel Money</option>
            <option value="bank">Bank Transfer</option>
          </select>
        </div>

        {/* Withdrawals Table */}
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden mb-8">
          <div className="p-4 border-b border-white/10 bg-white/5">
            <h2 className="text-xl font-semibold">Withdrawal Requests</h2>
          </div>
          {withdrawals.length > 0 ? (
            <div className="p-4 space-y-4">
              {withdrawals.map((withdrawal: any) => (
                <div
                  key={withdrawal.id}
                  className="p-6 rounded-xl bg-slate-900/40 border border-white/10 hover:border-white/20 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">{withdrawal.users?.full_name || 'Unknown'}</h3>
                      <p className="text-gray-400 text-sm">{withdrawal.users?.email || ''}</p>
                    </div>
                    <span
                      className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium ${
                        statusColors[withdrawal.status] || statusColors.pending
                      }`}
                    >
                      {String(withdrawal.status || 'pending').toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
                    <div>
                      <p className="text-gray-400">Amount</p>
                      <p className="text-emerald-400 font-semibold">{formatRwfCompact(withdrawal.amount)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Method</p>
                      <p className="text-white font-semibold">
                        {methodLabels[withdrawal.method] || withdrawal.method}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Date</p>
                      <p className="text-white font-semibold">
                        {new Date(withdrawal.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {withdrawal.status === 'pending' ? (
                    <div className="relative">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveWithdrawal(withdrawal.id)}
                          disabled={actionLoading === `withdraw-${withdrawal.id}`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded transition-colors disabled:opacity-50 text-sm font-medium"
                          title="Approve withdrawal"
                        >
                          <Check className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => setShowRejectForm(showRejectForm === withdrawal.id ? null : withdrawal.id)}
                          disabled={actionLoading === `withdraw-${withdrawal.id}`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded transition-colors disabled:opacity-50 text-sm font-medium"
                          title="Reject withdrawal"
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </button>
                      </div>

                      {showRejectForm === withdrawal.id && (
                        <div className="mt-4 bg-slate-800 p-4 rounded-lg border border-red-500 z-10 w-full max-w-md">
                          <p className="text-sm mb-2 font-semibold">Provide rejection reason:</p>
                          <textarea
                            value={rejectNotes[withdrawal.id] || ''}
                            onChange={(e) =>
                              setRejectNotes((prev) => ({ ...prev, [withdrawal.id]: e.target.value }))
                            }
                            className="w-full p-2 bg-slate-700 border border-red-500 rounded text-sm mb-2 h-20"
                            placeholder="e.g., Incorrect payment details..."
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRejectWithdrawal(withdrawal.id)}
                              className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-sm rounded font-medium"
                            >
                              Confirm Reject
                            </button>
                            <button
                              onClick={() => setShowRejectForm(null)}
                              className="flex-1 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-sm rounded font-medium"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : withdrawal.status === 'approved' ? (
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-green-400 italic">Approved, pending payment</span>
                      <button
                        onClick={() => handleMarkAsPaid(withdrawal.id)}
                        disabled={actionLoading === `withdraw-${withdrawal.id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded transition-colors disabled:opacity-50 text-sm font-medium"
                        title="Mark as paid"
                      >
                        <Check className="w-4 h-4" />
                        Mark Paid
                      </button>
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm">
                      {withdrawal.status === 'paid' ? 'Payment completed.' : 'This request has been processed.'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400">No withdrawals found</div>
          )}

          <div className="flex items-center justify-between p-6 border-t border-white/10">
            <p className="text-sm text-gray-400">
              Showing {Math.min((page + 1) * 50, total)} of {total} withdrawals
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
