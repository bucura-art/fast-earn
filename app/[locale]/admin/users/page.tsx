"use client"

import { useState, useEffect } from 'react'
import { useAdminRoute } from '@/lib/hooks'
import { getAllUsers, toggleUserSuspension, verifyUser, logFraud, resetUserBalanceToHalf } from '@/lib/admin'
import { getCurrentUser } from '@/lib/auth'
import AdminLoading from '@/components/admin/AdminPageLoading'
import { Search, Shield, Ban, CheckCircle } from 'lucide-react'

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
  const [filterVerified, setFilterVerified] = useState<string>('')
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
          is_verified: filterVerified === '' ? undefined : filterVerified === 'true',
          is_suspended: undefined,
        })

        let filteredUsers = fetchedUsers
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
  }, [isProtected, page, filterVerified, search])

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

  const handleVerify = async (userId: string) => {
    setActionLoading(userId)
    try {
      await verifyUser(userId, adminId)
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_verified: true } : u)))
    } catch (error) {
      console.error('Error verifying user:', error)
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
      userName: targetUser.full_name || targetUser.email || 'User',
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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-emerald-950 to-slate-900 text-white py-8">
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
                placeholder="Search by email or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
              />
            </div>

            <select
              value={filterVerified}
              onChange={(e) => setFilterVerified(e.target.value)}
              className="px-4 py-2 bg-slate-900 border border-white/20 rounded-lg text-white"
            >
              <option value="">All Verification States</option>
              <option value="true">Verified Only</option>
              <option value="false">Unverified Only</option>
            </select>
          </div>
        </div>

        {/* Users Grid */}
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="p-6">
            {users.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {users.map((user: any) => (
                  <article
                    key={user.id}
                    className="rounded-xl border border-white/10 bg-slate-900/40 p-4 hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-white truncate">{user.full_name}</h3>
                        <span className="text-sm text-gray-400 break-all block">{user.email}</span>
                        <span className="text-sm text-gray-400 block">Phone: {getUserPhone(user) || 'Not provided'}</span>
                      </div>
                      <span className="shrink-0 px-2 py-1 bg-blue-900/40 text-blue-400 rounded text-xs font-semibold">
                        {user.tier?.toUpperCase() || 'FREE'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {user.is_verified ? (
                        <span className="px-2 py-1 bg-green-900/40 text-green-400 rounded text-xs font-semibold">
                          Verified
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-yellow-900/40 text-yellow-400 rounded text-xs font-semibold">
                          Unverified
                        </span>
                      )}
                      {user.is_suspended && (
                        <span className="px-2 py-1 bg-red-900/40 text-red-400 rounded text-xs font-semibold">
                          Suspended
                        </span>
                      )}
                    </div>

                    <div className="mb-4">
                      <p className="text-xs text-gray-400">Balance</p>
                      <p className="text-emerald-400 font-semibold">{formatRwfCompact(user.balance)}</p>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {user.role === 'admin' ? (
                        <span className="px-2 py-1 bg-purple-900/40 text-purple-400 rounded text-xs font-semibold border border-purple-500/30">
                          Admin Access
                        </span>
                      ) : (
                        <>
                          {!user.is_verified && (
                            <button
                              onClick={() => handleVerify(user.id)}
                              disabled={actionLoading === user.id}
                              className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-600 hover:bg-green-500 rounded text-xs font-medium transition-colors disabled:opacity-50"
                              title="Verify user"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Verify
                            </button>
                          )}

                          <button
                            onClick={() => handleSuspend(user.id, !user.is_suspended)}
                            disabled={actionLoading === user.id}
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
                              user.is_suspended
                                ? 'bg-gray-600 hover:bg-gray-500'
                                : 'bg-orange-600 hover:bg-orange-500'
                            }`}
                            title={user.is_suspended ? 'Unsuspend user' : 'Suspend user'}
                          >
                            <Ban className="w-3.5 h-3.5" />
                            {user.is_suspended ? 'Unsuspend' : 'Suspend'}
                          </button>

                          <button
                            onClick={() => handleFlagFraud(user.id, 'manual_admin_flag')}
                            disabled={actionLoading === user.id}
                            className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-xs font-medium transition-colors disabled:opacity-50"
                            title="Flag as fraud"
                          >
                            <Shield className="w-3.5 h-3.5" />
                            Flag Fraud
                          </button>

                          <button
                            onClick={() => handleResetBalance(user)}
                            disabled={actionLoading === user.id}
                            className="inline-flex items-center gap-1.5 px-2 py-1 bg-red-700 hover:bg-red-600 rounded text-xs font-medium transition-colors disabled:opacity-50"
                            title="Reset user balance to half"
                          >
                            Reset Balance
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-400">No users found</div>
            )}
          </div>

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
