"use client"

import { use } from 'react'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProtectedRoute } from '@/lib/hooks'
import { getCurrentUser, updateUserProfile, logout } from '@/lib/auth'
import supabase from '@/lib/supabaseClient'
import { User } from '@/lib/types'
import PageLoading from '@/components/general/PageLoading'
import SiteHeader from '@/components/general/SiteHeader'

interface ProfilePageProps {
  params: Promise<{ locale: string }>
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const { locale } = use(params)
  const router = useRouter()
  const { isProtected } = useProtectedRoute()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [accountCategory, setAccountCategory] = useState('free')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
  })

  useEffect(() => {
    if (!isProtected) return

    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser()
        setUser(currentUser)
        if (currentUser) {
          const tierFromUser = typeof currentUser.tier === 'string' ? currentUser.tier : ''
          let resolvedCategory = tierFromUser

          if (!resolvedCategory && currentUser.tier_id) {
            const { data: tierRow } = await supabase
              .from('tiers')
              .select('name')
              .eq('id', currentUser.tier_id || currentUser.tier)
              .maybeSingle()

            resolvedCategory = tierRow?.name || ''
          }

          setAccountCategory((resolvedCategory || 'free').toLowerCase())

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
    }

    loadUser()
  }, [isProtected])

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
    return (
      <div className="min-h-screen flex flex-col bg-linear-to-b from-slate-900 via-indigo-950 to-slate-900 pb-24 text-white md:pb-0">
        <SiteHeader locale={locale} />
        <PageLoading className="min-h-0 flex-1" />
      </div>
    )
  }

  const categoryLabel = accountCategory === 'pro_max'
    ? 'PRO MAX'
    : accountCategory === 'pro'
      ? 'PRO'
      : 'FREE'
  return (
    <div className="min-h-screen flex flex-col bg-linear-to-b from-slate-900 via-indigo-950 to-slate-900 pb-24 text-white md:pb-0">
      <SiteHeader locale={locale} />
      <main className="py-8">
        <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-6">
          <a href={`/${locale}/dashboard`} className="text-sm text-gray-300 hover:text-white">{'<-'} Back</a>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold">Profile Settings</h1>
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

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white/5 border border-white/10">
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
                  <p className="text-gray-400 text-sm mb-1">Full Name</p>
                  <p className="text-lg font-medium">{user?.full_name}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Email</p>
                  <p className="text-lg font-medium break-all">-</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Phone</p>
                  <p className="text-lg font-medium">{user?.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Account Status</p>
                  <p className={`text-lg font-medium ${user?.is_verified ? 'text-green-400' : 'text-yellow-400'}`}>
                    {user?.is_verified ? 'Verified' : 'Pending Verification'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <h2 className="text-xl font-bold mb-4">Account Category</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-2xl font-bold text-blue-400">{categoryLabel}</p>
                </div>
                <a
                  href={`/${locale}/pricing`}
                  className="inline-block mt-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors"
                >
                  Upgrade account
                </a>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <button
                onClick={handleLogout}
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
        </div>
      </main>
    </div>
  )
}
