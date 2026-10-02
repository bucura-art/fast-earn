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
            <hr className="border-white/10" />
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
            <option value="mtn">MTN MOMO</option>
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
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-left">
                    <th scope="col" className="px-4 py-3 font-semibold">User</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Amount</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Method</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Date</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((withdrawal: any) => (
                    <tr key={withdrawal.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                      <td className="px-4 py-3 font-semibold text-white">
                        {withdrawal.users?.full_name || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-semibold text-emerald-400">
                        {formatRwfCompact(withdrawal.amount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-white">
                        {methodLabels[withdrawal.method] || withdrawal.method}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-300">
                        {new Date(withdrawal.created_at).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            statusColors[withdrawal.status] || statusColors.pending
                          }`}
                        >
                          {String(withdrawal.status || 'pending').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {withdrawal.status === 'pending' ? (
                          <div className="min-w-64">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApproveWithdrawal(withdrawal.id)}
                                disabled={actionLoading === `withdraw-${withdrawal.id}`}
                                className="inline-flex items-center gap-1.5 rounded bg-green-600 px-3 py-2 text-sm font-medium transition-colors hover:bg-green-500 disabled:opacity-50"
                                title="Approve withdrawal"
                              >
                                <Check className="h-4 w-4" />
                                Approve
                              </button>
                              <button
                                onClick={() =>
                                  setShowRejectForm(showRejectForm === withdrawal.id ? null : withdrawal.id)
                                }
                                disabled={actionLoading === `withdraw-${withdrawal.id}`}
                                className="inline-flex items-center gap-1.5 rounded bg-red-600 px-3 py-2 text-sm font-medium transition-colors hover:bg-red-500 disabled:opacity-50"
                                title="Reject withdrawal"
                              >
                                <X className="h-4 w-4" />
                                Reject
                              </button>
                            </div>

                            {showRejectForm === withdrawal.id && (
                              <div className="mt-3 rounded-lg border border-red-500 bg-slate-800 p-3">
                                <p className="mb-2 text-sm font-semibold">Provide rejection reason:</p>
                                <textarea
                                  value={rejectNotes[withdrawal.id] || ''}
                                  onChange={(e) =>
                                    setRejectNotes((prev) => ({ ...prev, [withdrawal.id]: e.target.value }))
                                  }
                                  className="mb-2 h-20 w-full rounded border border-red-500 bg-slate-700 p-2 text-sm"
                                  placeholder="e.g., Incorrect payment details..."
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleRejectWithdrawal(withdrawal.id)}
                                    className="flex-1 rounded bg-red-600 px-3 py-1.5 text-sm font-medium hover:bg-red-500"
                                  >
                                    Confirm Reject
                                  </button>
                                  <button
                                    onClick={() => setShowRejectForm(null)}
                                    className="flex-1 rounded bg-gray-600 px-3 py-1.5 text-sm hover:bg-gray-500"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : withdrawal.status === 'approved' ? (
                          <div className="flex items-center gap-3 whitespace-nowrap">
                            <span className="text-xs italic text-green-400">Approved, pending payment</span>
                            <button
                              onClick={() => handleMarkAsPaid(withdrawal.id)}
                              disabled={actionLoading === `withdraw-${withdrawal.id}`}
                              className="inline-flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-2 text-sm font-medium transition-colors hover:bg-emerald-500 disabled:opacity-50"
                              title="Mark as paid"
                            >
                              <Check className="h-4 w-4" />
                              Mark Paid
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400">
                            {withdrawal.status === 'paid' ? 'Payment completed.' : 'This request has been processed.'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400">No withdrawals found</div>
          )}

          <div className="flex items-center justify-between p-6 border-t border-white/10">
            <p className="text-xs text-gray-400">
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
