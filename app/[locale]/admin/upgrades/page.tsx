'use client'

import { useState, useEffect, use } from 'react'
import { useAdminRoute } from '@/lib/hooks'
import AdminLoading from '@/components/admin/AdminPageLoading'
import { Check, CheckCircle, X } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

interface UpgradeRequest {
  id: string
  user_id: string
  users?: { full_name?: string; email?: string }
  requested_tier_id: string
  tiers?: { name?: string; monthly_price?: number }
  amount: number
  paid_phone: string
  final_amount?: number
  status: 'pending' | 'confirmed' | 'rejected'
  admin_id?: string
  created_at: string
}

type UpgradeAction = 'confirm' | 'reject'

interface PendingUpgradeAction {
  requestId: string
  action: UpgradeAction
  userName: string
  tierName: string
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AdminUpgradesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  const { isProtected, user } = useAdminRoute()
  const [requests, setRequests] = useState<UpgradeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingAction, setPendingAction] = useState<PendingUpgradeAction | null>(null)
  const [actionLoading, setActionLoading] = useState('')

  useEffect(() => {
    if (!isProtected) return
    loadRequests()
  }, [isProtected])

  async function loadRequests() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('upgrade_requests')
        .select('*, users!upgrade_requests_user_id_fkey(full_name, email), tiers(*)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      if (error) throw error

      setRequests(data || [])
    } catch (error) {
      console.error('Error loading upgrade requests:', error)
    } finally {
      setLoading(false)
    }
  }

  async function confirmUpgrade(id: string): Promise<boolean> {
    if (!user?.id) {
      console.error('User ID not available')
      return false
    }
    try {
      const res = await fetch(`/api/upgrade-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed', adminId: user.id }),
      })
      if (!res.ok) throw new Error('Failed to confirm')
      setRequests((prev) => prev.filter((r) => r.id !== id))
      return true
    } catch (error) {
      console.error('Error confirming upgrade:', error)
      return false
    }
  }

  async function rejectUpgrade(id: string): Promise<boolean> {
    if (!user?.id) {
      console.error('User ID not available')
      return false
    }
    try {
      const res = await fetch(`/api/upgrade-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', adminId: user.id }),
      })
      if (!res.ok) throw new Error('Failed to reject')
      setRequests((prev) => prev.filter((r) => r.id !== id))
      return true
    } catch (error) {
      console.error('Error rejecting upgrade:', error)
      return false
    }
  }

  function openActionModal(request: UpgradeRequest, action: UpgradeAction) {
    setPendingAction({
      requestId: request.id,
      action,
      userName: request.users?.full_name || request.users?.email || 'Unknown',
      tierName: request.tiers?.name || 'Unknown',
    })
  }

  function closeActionModal() {
    if (actionLoading) return
    setPendingAction(null)
  }

  async function handleConfirmAction() {
    if (!pendingAction || actionLoading) return

    const loadingKey = `${pendingAction.action}-${pendingAction.requestId}`
    setActionLoading(loadingKey)

    const success =
      pendingAction.action === 'confirm'
        ? await confirmUpgrade(pendingAction.requestId)
        : await rejectUpgrade(pendingAction.requestId)

    setActionLoading('')
    if (success) setPendingAction(null)
  }

  if (loading) {
    return <AdminLoading />
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-emerald-950 to-slate-900 text-white py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Upgrade Requests</h1>
          <p className="text-gray-300">Review and confirm tier upgrade payments</p>
        </div>

        {requests.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
            <p className="text-gray-300">No pending upgrade requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div key={req.id} className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">{req.users?.full_name || 'Unknown'}</h3>
                    <p className="text-gray-400 text-sm">{req.users?.email || ''}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 text-sm font-medium">
                    {req.status.toUpperCase()}
                  </span>
                </div>

                <div className="grid md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-gray-400 text-sm">Tier</p>
                    <p className="text-white font-semibold">{req.tiers?.name || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Amount</p>
                    <p className="text-white font-semibold">{req.amount} RWF</p>
                  </div>
                  {req.final_amount && (
                    <div>
                      <p className="text-gray-400 text-sm">Final Amount</p>
                      <p className="text-white font-semibold text-lg">{req.final_amount} RWF</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-400 text-sm">Phone Used</p>
                    <p className="text-white font-semibold">{req.paid_phone}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Date</p>
                    <p className="text-white font-semibold">{new Date(req.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openActionModal(req, 'confirm')}
                    disabled={Boolean(actionLoading)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded text-white font-medium"
                  >
                    <Check className="w-4 h-4" /> Confirm
                  </button>
                  <button
                    onClick={() => openActionModal(req, 'reject')}
                    disabled={Boolean(actionLoading)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded text-white font-medium"
                  >
                    <X className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {pendingAction && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-5">
            <h2 className="text-xl font-bold mb-2">
              {pendingAction.action === 'confirm' ? 'Confirm Upgrade Request' : 'Reject Upgrade Request'}
            </h2>
            <p className="text-sm text-gray-300 mb-4">
              Are you sure you want to {pendingAction.action}{' '}
              <span className="text-white font-semibold">{pendingAction.userName}</span>
              {'\''}s upgrade to{' '}
              <span className="text-white font-semibold">{pendingAction.tierName}</span>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={closeActionModal}
                disabled={Boolean(actionLoading)}
                className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleConfirmAction()}
                disabled={Boolean(actionLoading)}
                className={`px-3 py-2 rounded text-sm text-white disabled:opacity-50 ${
                  pendingAction.action === 'confirm'
                    ? 'bg-green-600 hover:bg-green-500'
                    : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                {actionLoading
                  ? 'Processing...'
                  : pendingAction.action === 'confirm'
                    ? 'Yes, Confirm'
                    : 'Yes, Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
