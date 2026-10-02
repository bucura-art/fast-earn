'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { useAdminRoute } from '@/lib/hooks'
import AdminLoading from '@/components/admin/AdminPageLoading'
import { supabase } from '@/lib/supabase-client'

interface InvestorRequest {
  id: string
  user_id: string
  users?: { full_name?: string | null } | null
  product_code: string
  product_name: string
  purchase_price: number
  daily_income: number
  duration_days: number
  paid_phone: string
  status: string
  created_at: string
}

interface RequestCounts {
  all: number
  pending: number
  approved: number
  rejected: number
}

interface InvestorsPageProps {
  params: Promise<{ locale: string }>
}

type RequestAction = 'accept' | 'reject'

interface PendingRequestAction {
  request: InvestorRequest
  action: RequestAction
}

const PAGE_SIZE = 50

export default function InvestorsPage({ params }: InvestorsPageProps) {
  const { locale } = use(params)
  const { isProtected } = useAdminRoute()
  const [requests, setRequests] = useState<InvestorRequest[]>([])
  const [counts, setCounts] = useState<RequestCounts>({ all: 0, pending: 0, approved: 0, rejected: 0 })
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingRequestAction | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const loadInvestorRequests = useCallback(async () => {
    if (!isProtected) return

    setLoading(true)
    setErrorMessage(null)
    try {
      const [requestsResult, allResult, pendingResult, approvedResult, rejectedResult] = await Promise.all([
        supabase
          .from('product_purchase_requests')
          .select(
            'id, user_id, product_code, product_name, purchase_price, daily_income, duration_days, paid_phone, status, created_at, users!product_purchase_requests_user_id_fkey(full_name)',
            { count: 'exact' }
          )
          .order('created_at', { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1),
        supabase.from('product_purchase_requests').select('id', { count: 'exact', head: true }),
        supabase
          .from('product_purchase_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('product_purchase_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'approved'),
        supabase
          .from('product_purchase_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'rejected'),
      ])

      const error =
        requestsResult.error ??
        allResult.error ??
        pendingResult.error ??
        approvedResult.error ??
        rejectedResult.error
      if (error) throw error

      setRequests((requestsResult.data || []) as InvestorRequest[])
      setTotal(requestsResult.count || 0)
      setCounts({
        all: allResult.count || 0,
        pending: pendingResult.count || 0,
        approved: approvedResult.count || 0,
        rejected: rejectedResult.count || 0,
      })
    } catch (error) {
      console.error('Error loading investment requests:', error)
      setErrorMessage('Unable to load investment requests. Please try again later.')
    } finally {
      setLoading(false)
    }
  }, [isProtected, page])

  useEffect(() => {
    void loadInvestorRequests()
  }, [loadInvestorRequests])

  const handleRequestAction = async () => {
    if (!pendingAction || actionLoading) return

    setActionLoading(true)
    setActionError(null)
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError

      const accessToken = sessionData.session?.access_token
      if (!accessToken) throw new Error('Your session has expired. Please sign in again.')

      const response = await fetch(`/api/product-purchase-requests/${pendingAction.request.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: pendingAction.action === 'accept' ? 'approved' : 'rejected' }),
      })
      const result = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(result.error || 'Could not update the investment request.')

      const nextStatus = pendingAction.action === 'accept' ? 'approved' : 'rejected'
      setRequests((current) =>
        current.map((request) =>
          request.id === pendingAction.request.id ? { ...request, status: nextStatus } : request
        )
      )
      setCounts((current) => ({
        ...current,
        pending: Math.max(0, current.pending - 1),
        [nextStatus]: current[nextStatus] + 1,
      }))
      setPendingAction(null)
    } catch (error) {
      console.error('Error processing investment request:', error)
      setActionError(error instanceof Error ? error.message : 'Could not update the investment request.')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <AdminLoading />

  const formatRwf = (amount: number) => `${Number(amount || 0).toLocaleString('en-GB')} RWF`
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-GB')
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-900/40 text-yellow-400',
    approved: 'bg-green-900/40 text-green-400',
    rejected: 'bg-red-900/40 text-red-400',
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-900 via-emerald-950 to-slate-900 py-8 text-white">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl uppercase font-bold">Investors Requestst</h1>
        </div>

        {errorMessage && (
          <div role="alert" className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-red-300">
            {errorMessage}
          </div>
        )}

        <div className="mb-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-2 text-sm font-semibold text-gray-300">All Requests</h2>
            <p className="text-3xl font-bold text-white">{counts.all}</p>
          </div>
          <div className="rounded-2xl border border-yellow-500/30 bg-white/5 p-6">
            <h2 className="mb-2 text-sm font-semibold text-gray-300">Pending</h2>
            <p className="text-3xl font-bold text-yellow-400">{counts.pending}</p>
          </div>
          <div className="rounded-2xl border border-green-500/30 bg-white/5 p-6">
            <h2 className="mb-2 text-sm font-semibold text-gray-300">Approved</h2>
            <p className="text-3xl font-bold text-green-400">{counts.approved}</p>
          </div>
          <div className="rounded-2xl border border-red-500/30 bg-white/5 p-6">
            <h2 className="mb-2 text-sm font-semibold text-gray-300">Rejected</h2>
            <p className="text-3xl font-bold text-red-400">{counts.rejected}</p>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <div className="border-b border-white/10 p-6">
            <h2 className="text-2xl font-bold">Investment Requests</h2>
          </div>

          {requests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-1100px text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-left">
                    <th scope="col" className="px-4 py-3 font-semibold">Investor</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Product</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Price</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Paid Phone</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Date</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-white">{request.users?.full_name || 'Unknown User'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{request.product_name}</p>
                        <p className="text-xs text-gray-400">{request.product_code}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-emerald-400">
                        {formatRwf(request.purchase_price)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-300">{request.paid_phone}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${
                            statusColors[request.status] || 'bg-gray-900/40 text-gray-300'
                          }`}
                        >
                          {request.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-300">
                        {formatDate(request.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        {request.status === 'pending' ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setActionError(null)
                                setPendingAction({ request, action: 'accept' })
                              }}
                              disabled={actionLoading}
                              className="inline-flex items-center gap-1.5 rounded bg-green-600 px-3 py-2 font-medium text-white hover:bg-green-500 disabled:opacity-50"
                            >
                              <Check className="h-4 w-4" /> Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActionError(null)
                                setPendingAction({ request, action: 'reject' })
                              }}
                              disabled={actionLoading}
                              className="inline-flex items-center gap-1.5 rounded bg-red-600 px-3 py-2 font-medium text-white hover:bg-red-500 disabled:opacity-50"
                            >
                              <X className="h-4 w-4" /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400">No investment requests found</div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 p-6">
            <p className="text-sm text-gray-400">
              Showing {Math.min((page + 1) * PAGE_SIZE, total)} of {total} requests
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                disabled={page === 0 || loading}
                className="rounded bg-white/10 px-4 py-2 transition-colors hover:bg-white/20 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((current) => current + 1)}
                disabled={(page + 1) * PAGE_SIZE >= total || loading}
                className="rounded bg-white/10 px-4 py-2 transition-colors hover:bg-white/20 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </section>

        {pendingAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="request-action-title"
              className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-5"
            >
              <h2 id="request-action-title" className="mb-2 text-xl font-bold">
                {pendingAction.action === 'accept' ? 'Accept Investment Request' : 'Reject Investment Request'}
              </h2>
              <p className="mb-4 text-sm text-gray-300">
                Are you sure you want to {pendingAction.action}{' '}
                <span className="font-semibold text-white">
                  {pendingAction.request.users?.full_name || 'this user'}
                </span>
                's request for{' '}
                <span className="font-semibold text-white">{pendingAction.request.product_name}</span>?
              </p>
              {actionError && (
                <p role="alert" className="mb-4 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
                  {actionError}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (actionLoading) return
                    setPendingAction(null)
                    setActionError(null)
                  }}
                  disabled={actionLoading}
                  className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/20 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleRequestAction()}
                  disabled={actionLoading}
                  className={`rounded px-3 py-2 text-sm text-white disabled:opacity-50 ${
                    pendingAction.action === 'accept'
                      ? 'bg-green-600 hover:bg-green-500'
                      : 'bg-red-600 hover:bg-red-500'
                  }`}
                >
                  {actionLoading ? 'Processing...' : pendingAction.action === 'accept' ? 'Yes, Accept' : 'Yes, Reject'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}