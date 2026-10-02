'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminRoute } from '@/lib/hooks'
import { getCurrentUser, logout } from '@/lib/auth'
import AdminLoading from '@/components/admin/AdminPageLoading'
import type { User } from '@/lib/types'
import { supabase } from '@/lib/supabaseClient'
import { LogOut } from 'lucide-react'

interface AdminProfilePageProps {
  params: Promise<{ locale: string }>
}

interface AdminAccount {
  id: string
  full_name: string | null
  email: string
  phone: string | null
  is_verified: boolean
}

export default function AdminProfilePage({ params }: AdminProfilePageProps) {
  const { locale } = use(params)
  const router = useRouter()
  const { isProtected } = useAdminRoute()
  const [user, setUser] = useState<User | null>(null)
  const [otherAdmins, setOtherAdmins] = useState<AdminAccount[]>([])
  const [adminsLoading, setAdminsLoading] = useState(true)
  const [adminsError, setAdminsError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadUser = useCallback(async () => {
    if (!isProtected) return

    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      console.error('Error loading admin profile:', error)
      setMessage({ type: 'error', text: 'Unable to load account details.' })
    } finally {
      setLoading(false)
    }
  }, [isProtected])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  useEffect(() => {
    if (!isProtected || !user?.id) return

    const currentUserId = user.id
    let cancelled = false

    async function loadOtherAdmins() {
      setAdminsLoading(true)
      setAdminsError(null)
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, email, phone, is_verified')
          .eq('role', 'admin')
          .neq('id', currentUserId)
          .order('full_name', { ascending: true })

        if (error) throw error
        if (!cancelled) setOtherAdmins(data || [])
      } catch (error) {
        console.error('Error loading other admin accounts:', error)
        if (!cancelled) setAdminsError('Unable to load other admin accounts.')
      } finally {
        if (!cancelled) setAdminsLoading(false)
      }
    }

    void loadOtherAdmins()
    return () => {
      cancelled = true
    }
  }, [isProtected, user?.id])

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await logout()
      router.push(`/${locale}`)
    } catch (error) {
      console.error('Admin sign out error:', error)
      setMessage({ type: 'error', text: 'Unable to sign out. Please try again.' })
      setSigningOut(false)
    }
  }

  if (loading) return <AdminLoading />

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-900 via-emerald-950 to-slate-900 py-8 text-white">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl uppercase font-bold">Admin Account</h1>
          <hr className="border-white/10" />
        </div>

        {message && (
          <div
            role="status"
            className={`mb-6 rounded-lg border p-4 ${
              message.type === 'success'
                ? 'border-green-500 bg-green-500/10 text-green-300'
                : 'border-red-500 bg-red-500/10 text-red-300'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-6">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold">Account Information</h2>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                disabled={signingOut}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-500 disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
                {signingOut ? 'Signing Out...' : 'Sign Out'}
              </button>
            </div>

            {user ? (
              <dl className="grid gap-5 md:grid-cols-2">
                <div>
                  <dt className="text-xs text-gray-400">Full Name</dt>
                  <dd className="text-lg font-medium">{user.full_name || 'Not set'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">Email</dt>
                  <dd className="break-all text-lg font-medium">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">Phone</dt>
                  <dd className="text-lg font-medium">{user.phone || 'Not provided'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">Account Status</dt>
                  <dd className={`text-lg font-medium ${user.is_verified ? 'text-green-400' : 'text-yellow-400'}`}>
                    {user.is_verified ? 'Verified' : 'Pending Verification'}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-gray-300">Unable to load account details.</p>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <div className="border-b border-white/10 p-6">
              <h2 className="text-xl font-bold">Other Admins</h2>
            </div>

            {adminsLoading ? (
              <p className="p-6 text-sm text-gray-400">Loading admin accounts...</p>
            ) : adminsError ? (
              <p role="alert" className="p-6 text-sm text-red-300">{adminsError}</p>
            ) : otherAdmins.length === 0 ? (
              <p className="p-6 text-sm text-gray-400">No other admin accounts found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-600px text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-left">
                      <th scope="col" className="px-4 py-3 font-semibold">Name</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Email</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Phone</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {otherAdmins.map((admin) => {
                      const name = admin.full_name?.trim() || 'Name not set'

                      return (
                        <tr key={admin.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/20 font-bold text-emerald-200">
                                {name.charAt(0).toUpperCase()}
                              </span>
                              <span className="font-medium text-white">{name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-300">{admin.email}</td>
                          <td className="px-4 py-3 text-gray-300">{admin.phone || 'Not provided'}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${
                                admin.is_verified
                                  ? 'bg-green-900/40 text-green-400'
                                  : 'bg-yellow-900/40 text-yellow-400'
                              }`}
                            >
                              {admin.is_verified ? 'Verified' : 'Pending verification'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}