"use client"

import { use, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminRoute } from '@/lib/hooks'
import { getCurrentUser, updateUserProfile, logout } from '@/lib/auth'
import AdminLoading from '@/components/admin/AdminPageLoading'
import { LogOut } from 'lucide-react'

interface AdminSettingsPageProps {
  params: Promise<{ locale: string }>
}

export default function AdminSettingsPage({ params }: AdminSettingsPageProps) {
  const { locale } = use(params)
  const router = useRouter()
  const { isProtected } = useAdminRoute()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
  })

  const loadUser = useCallback(async () => {
    if (!isProtected) return

    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
      if (currentUser) {
        setFormData({
          fullName: currentUser.full_name || '',
          phone: currentUser.phone || '',
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }, [isProtected])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSubmitting(true)
    setMessage(null)

    try {
      await updateUserProfile(user.id, {
        full_name: formData.fullName,
        phone: formData.phone,
      } as any)

      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      setEditing(false)

      // Reload user data
      const updatedUser = await getCurrentUser()
      setUser(updatedUser)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      router.push(`/${locale}`)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (loading) {
    return <AdminLoading />
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-emerald-950 to-slate-900 text-white py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Admin Settings</h1>
          <p className="text-gray-300">Manage your admin profile and account details.</p>
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg border mb-6 ${
              message.type === 'success'
                ? 'bg-green-500/10 border-green-500 text-green-300'
                : 'bg-red-500/10 border-red-500 text-red-300'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-6">
          {/* Profile Card */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Account Information</h2>
              <button
                onClick={() => setEditing(!editing)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
              >
                {editing ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {editing ? (
              <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full md:w-auto py-2 px-6 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white font-bold rounded-lg transition-colors"
                  >
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <span className="text-gray-400 text-xs block">Full Name</span>
                  <p className="text-lg font-medium">{user?.full_name || 'Not set'}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs block">Email</span>
                  <p className="text-lg font-medium break-all">{user?.email}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs block">Phone</span>
                  <p className="text-lg font-medium">{user?.phone || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs block">Account Status</span>
                  <p className={`text-lg font-medium ${user?.is_verified ? 'text-green-400' : 'text-yellow-400'}`}>
                    {user?.is_verified ? 'Verified' : 'Pending Verification'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Admin Role Card */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <h2 className="text-xl font-bold mb-4">Admin Role</h2>
            <div className="space-y-4">
              <div>
                <span className="text-gray-400 text-xs block">Role</span>
                <p className="text-lg font-medium text-emerald-400">ADMIN</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs block">Permissions</span>
                <ul className="mt-2 space-y-1 text-sm">
                  <li className="text-gray-300">✓ User Management</li>
                  <li className="text-gray-300">✓ Task Management</li>
                  <li className="text-gray-300">✓ Support Chats</li>
                  <li className="text-gray-300">✓ Upgrade Management</li>
                  <li className="text-gray-300">✓ Withdrawal Management</li>
                  <li className="text-gray-300">✓ Subscription Management</li>
                  <li className="text-gray-300">✓ Fraud Detection</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Logout Card */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
