"use client"

import { useState, useEffect } from 'react'
import { useAdminRoute } from '@/lib/hooks'
import { getAllUsers, toggleUserSuspension, logFraud, resetUserBalanceToHalf } from '@/lib/admin'
import { getCurrentUser } from '@/lib/auth'
import { supabase } from '@/lib/supabaseClient'
import AdminLoading from '@/components/admin/AdminPageLoading'
import { Search, Shield, Ban, RotateCcw } from 'lucide-react'

interface UserManagementProps {
  params: Promise<{ locale: string }>
}

export default function UserManagementPage(_: UserManagementProps) {
  const { isProtected } = useAdminRoute()
  const [loading, setLoading] = useState(true)
  const [adminId, setAdminId] = useState<string>('')
  const [users, setUsers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterTier, setFilterTier] = useState<string>('')
  const [sortUsers, setSortUsers] = useState<'balance_desc' | 'newest' | 'oldest'>('newest')
  const [actionLoading, setActionLoading] = useState<string>('')
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [resetModal, setResetModal] = useState<{
    userId: string
    userName: string
    currentBalance: number
    nextBalance: number
  } | null>(null)

  const formatRwfCompact = (amount: number) => {
    const value = Number(amount || 0)

    if (value >= 1_000_000) {
      return `${Number((value / 1_000_000).toFixed(1))}M RWF`
    }
    if (value >= 1_000) {
      return `${Number((value / 1_000).toFixed(1))}K RWF`
    }

    return `${value.toLocaleString()} RWF`
  }

  const getUserPhone = (user: any) => user?.phone || user?.phone_number || user?.phoneNumber || null

  useEffect(() => {
    if (!isProtected) return

    const loadUsers = async () => {
      try {
        const currentUser = await getCurrentUser()
        if (currentUser) setAdminId(currentUser.id)

        const { users: fetchedUsers, total: totalCount } = await getAllUsers(50, page * 50, {
          is_suspended: filterStatus === 'suspended' ? true : undefined,
          is_flagged: filterStatus === 'flagged' ? true : undefined,
          tier: filterTier || undefined,
          sort: sortUsers,
        })

        const userIds = fetchedUsers.map((user: any) => user.id)
        const { data: purchases, error: purchasesError } = userIds.length
          ? await supabase
              .from('product_purchase_requests')
              .select('user_id, product_name')
              .in('user_id', userIds)
              .eq('status', 'approved')
          : { data: [], error: null }

        if (purchasesError) throw purchasesError

        const productsByUser = new Map<string, Map<string, number>>()
        for (const purchase of purchases || []) {
          const products = productsByUser.get(purchase.user_id) || new Map<string, number>()
          products.set(purchase.product_name, (products.get(purchase.product_name) || 0) + 1)
          productsByUser.set(purchase.user_id, products)
        }

        let filteredUsers = fetchedUsers.map((user: any) => ({
          ...user,
          purchasedProducts: Array.from(productsByUser.get(user.id) || [], ([name, count]) => ({ name, count })),
        }))
        if (search.trim()) {
          const query = search.toLowerCase()
          filteredUsers = fetchedUsers.filter(
            (u: any) =>
              (u.email || '').toLowerCase().includes(query) ||
              (u.full_name || '').toLowerCase().includes(query)
          )
        }

        setUsers(filteredUsers)
        setTotal(totalCount)
      } catch (error) {
        console.error('Error loading users:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUsers()
  }, [isProtected, page, filterStatus, filterTier, search, sortUsers])

  const handleSuspend = async (userId: string, shouldSuspend: boolean) => {
    setActionLoading(userId)
    try {
      await toggleUserSuspension(userId, shouldSuspend, adminId)
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_suspended: shouldSuspend } : u)))
    } catch (error) {
      console.error('Error suspending user:', error)
    } finally {
      setActionLoading('')
    }
  }

  const handleFlagFraud = async (userId: string, fraudType: string) => {
    setActionLoading(userId)
    try {
      await logFraud(userId, fraudType, 'high', 'Manually flagged by admin', 'User suspended')
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_suspended: true } : u)))
    } catch (error) {
      console.error('Error flagging fraud:', error)
    } finally {
      setActionLoading('')
    }
  }

  const handleResetBalance = async (targetUser: any) => {
    if (!adminId || !targetUser?.id) return

    const currentBalance = Number(targetUser.balance || 0)
    const nextBalance = Math.round((currentBalance / 2) * 100) / 100
    setResetModal({
      userId: targetUser.id,
      userName: targetUser.full_name || 'User',
      currentBalance,
      nextBalance,
    })
  }

  const confirmResetBalance = async () => {
    if (!adminId || !resetModal) return

    setActionLoading(resetModal.userId)
    setNotice(null)
    try {
      const updated = await resetUserBalanceToHalf(resetModal.userId, adminId)
      setUsers((prev) =>
        prev.map((u) =>
          u.id === resetModal.userId
            ? {
                ...u,
                balance: Number(updated?.balance ?? resetModal.nextBalance),
              }
            : u
        )
      )
      setNotice({ type: 'success', text: 'Balance reset completed successfully.' })
      setResetModal(null)
    } catch (error) {
      console.error('Error resetting user balance:', error)
      setNotice({ type: 'error', text: 'Failed to reset user balance.' })
    } finally {
      setActionLoading('')
    }
  }

  if (loading) {
    return <AdminLoading />
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-900 via-emerald-950 to-slate-900 text-white py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">User Management</h1>
          <p className="text-gray-300 mb-6">Manage platform users, verify accounts, and handle violations</p>

          {notice && (
            <div
              className={`p-3 rounded-lg border mb-4 text-sm ${
                notice.type === 'success'
                  ? 'bg-green-500/10 border-green-500/40 text-green-300'
                  : 'bg-red-500/10 border-red-500/40 text-red-300'
              }`}
            >
              {notice.text}
            </div>
          )}

          {/* Filters */}
          <div className="grid md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value)
                setPage(0)
              }}
              className="px-4 py-2 bg-slate-900 border border-white/20 rounded-lg text-white"
            >
              <option value="">All Accounts</option>
              <option value="suspended">Suspended</option>
              <option value="flagged">Flagged</option>
            </select>

            <select
              value={filterTier}
              onChange={(e) => {
                setFilterTier(e.target.value)
                setPage(0)
              }}
              className="px-4 py-2 bg-slate-900 border border-white/20 rounded-lg text-white"
            >
              <option value="">All Membership</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="pro_max">Pro Max</option>
            </select>

            <select
              value={sortUsers}
              onChange={(e) => {
                setSortUsers(e.target.value as 'balance_desc' | 'newest' | 'oldest')
                setPage(0)
              }}
              className="px-4 py-2 bg-slate-900 border border-white/20 rounded-lg text-white"
            >
              <option value="balance_desc">Highest Balance</option>
              <option value="newest">Newest Accounts</option>
              <option value="oldest">Oldest Accounts</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          {users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-1000px text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-left">
                    <th scope="col" className="px-4 py-3 font-semibold">Name</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Phone</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Membership</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Products</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Balance</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user: any) => (
                    <tr key={user.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                      <td className="max-w-40 truncate px-4 py-3 font-semibold text-white" title={user.full_name || 'Unknown User'}>
                        {user.full_name || 'Unknown User'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-300">
                        {getUserPhone(user) || 'Not provided'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded bg-blue-900/40 px-2 py-1 text-xs font-semibold text-blue-400">
                          {user.tier?.toUpperCase() || 'FREE'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {user.purchasedProducts.length > 0 ? (
                          <div className="flex min-w-40 flex-wrap gap-1">
                            {user.purchasedProducts.map((product: { name: string; count: number }) => (
                              <span
                                key={product.name}
                                className="inline-flex rounded bg-emerald-900/40 px-2 py-1 text-xs font-medium text-emerald-300"
                                title={`${product.name}${product.count > 1 ? ` x${product.count}` : ''}`}
                              >
                                {product.name}{product.count > 1 ? ` x${product.count}` : ''}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-500">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-semibold text-emerald-400">
                        {formatRwfCompact(user.balance)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex min-w-max flex-wrap gap-1.5">
                          {user.role === 'admin' ? (
                            <span className="inline-flex whitespace-nowrap rounded border border-purple-500/30 bg-purple-900/40 px-2 py-1 text-xs font-semibold text-purple-400">
                              Admin Access
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleSuspend(user.id, !user.is_suspended)}
                                disabled={actionLoading === user.id}
                                className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors disabled:opacity-50 ${
                                  user.is_suspended ? 'bg-gray-600 hover:bg-gray-500' : 'bg-orange-600 hover:bg-orange-500'
                                }`}
                                title={user.is_suspended ? 'Unsuspend user' : 'Suspend user'}
                                aria-label={user.is_suspended ? 'Unsuspend user' : 'Suspend user'}
                              >
                                <Ban className="h-3.5 w-3.5" />
                              </button>

                              <button
                                onClick={() => handleFlagFraud(user.id, 'manual_admin_flag')}
                                disabled={actionLoading === user.id}
                                className="inline-flex h-8 w-8 items-center justify-center rounded bg-emerald-600 transition-colors hover:bg-emerald-500 disabled:opacity-50"
                                title="Flag as fraud"
                                aria-label="Flag as fraud"
                              >
                                <Shield className="h-3.5 w-3.5" />
                              </button>

                              <button
                                onClick={() => handleResetBalance(user)}
                                disabled={actionLoading === user.id}
                                className="inline-flex h-8 w-8 items-center justify-center rounded bg-red-700 transition-colors hover:bg-red-600 disabled:opacity-50"
                                title="Reset user balance to half"
                                aria-label="Reset user balance to half"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400">No users found</div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between p-6 border-t border-white/10">
            <p className="text-sm text-gray-400">
              Showing {Math.min((page + 1) * 50, total)} of {total} users
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

      {resetModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-5">
            <h2 className="text-lg font-bold mb-2">Confirm Balance Reset</h2>
            <p className="text-sm text-gray-300 mb-4">
              Reset <span className="text-white font-semibold">{resetModal.userName}</span> balance to half?
            </p>
            <div className="space-y-1 text-sm mb-5">
              <p className="text-gray-400">
                Current: <span className="text-white">{resetModal.currentBalance.toLocaleString()} RWF</span>
              </p>
              <p className="text-gray-400">
                New: <span className="text-white">{resetModal.nextBalance.toLocaleString()} RWF</span>
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setResetModal(null)}
                disabled={actionLoading === resetModal.userId}
                className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => void confirmResetBalance()}
                disabled={actionLoading === resetModal.userId}
                className="px-3 py-2 rounded bg-red-700 hover:bg-red-600 text-sm disabled:opacity-50"
              >
                {actionLoading === resetModal.userId ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
