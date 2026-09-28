'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import supabase from '@/lib/supabaseClient'
import { BadgeCheck, Landmark, AlertTriangle, Headset } from 'lucide-react'
import Link from 'next/link'
import PageLoading from '@/components/general/PageLoading'

export default function CheckpointPage() {
  const params = useParams()
  const locale = params.locale as string
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [isSuspended, setIsSuspended] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState('')
  const [payoutMethod, setPayoutMethod] = useState('')
  const [accountCategory, setAccountCategory] = useState('')


  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const { data: authRes } = await supabase.auth.getUser()
        const user = authRes?.user
        if (!user) {
          router.push(`/${locale}/login`)
          return
        }

        const { data: profileData } = await supabase.from('users').select('*, tiers(name)').eq('id', user.id).maybeSingle()
        if (!mounted) return

        if (profileData?.is_suspended) {
          setIsSuspended(true)
          setLoading(false)
          return
        }

        setProfile(profileData || null)
        setPhone(profileData?.phone || '')
        setCountry(profileData?.country || '')
        setPayoutMethod(profileData?.payout_method || '')
        if (profileData && (profileData as any).tiers) {
          setAccountCategory((profileData as any).tiers.name)
        }

        // attempt to auto-detect country if not present in profile
        if (!profileData?.country) {
          try {
            const resp = await fetch('https://ipapi.co/json/')
            const ipJson = await resp.json()
            if (ipJson && ipJson.country) {
              setCountry(ipJson.country)
            }
          } catch {
            // ignore
          }
        }
      } catch (e) {
        setError('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [locale, router])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!phone.trim()) {
      setError('Phone is required')
      return
    }
    if (!country) {
      setError('Country is required')
      return
    }
    if (!payoutMethod) {
      setError('Please select a payout method')
      return
    }

    setSaving(true)
    try {
      const { data: authRes } = await supabase.auth.getUser()
      const user = authRes?.user
      if (!user) throw new Error('Not authenticated')

      const updates: any = {
        phone: phone.trim(),
        country,
        payout_method: payoutMethod,
      }

      await supabase.from('users').update(updates).eq('id', user.id)
      setSuccess('Profile updated successfully! Redirecting...')
      setTimeout(() => router.push(`/${locale}/dashboard`), 1400)
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleCountryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target
    if (value) {
      // Capitalize the first letter, leave the rest as is
      setCountry(value.charAt(0).toUpperCase() + value.slice(1))
    } else {
      setCountry('')
    }
  }

  if (loading) {
    return <PageLoading />
  }

  if (isSuspended) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-red-950 to-slate-900 text-white py-12 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-black/40 p-8 rounded-2xl border border-red-500/30 backdrop-blur-sm text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold mb-4 text-white">Account Suspended</h1>
          <p className="text-gray-300 mb-8">
            Your account has been suspended due to a violation of our terms of service or suspicious activity.
          </p>
          <div className="space-y-4">
            <Link 
              href={`/${locale}/support`}
              className="block w-full py-3 px-4 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Headset className="w-5 h-5" />
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const email = profile?.email || ''
  const fullName = profile?.full_name || ''
  const isVerified = profile?.is_verified
  const categoryDisplayName = accountCategory ? accountCategory.charAt(0).toUpperCase() + accountCategory.slice(1).replace('_', ' ') : 'FREE'

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold">Complete Your Profile</h1>
          <p className="text-lg text-gray-300 mt-2">Please provide these details to continue.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <h2 className="text-2xl font-bold mb-6">Your Profile</h2>

            <div className="space-y-4">
              <div className="p-4 bg-black/20 rounded-lg border border-white/10">
                <p className="text-sm text-gray-400">Full Name</p>
                <p className="font-semibold text-lg text-white">{fullName || '—'}</p>
              </div>

              <div className="p-4 bg-black/20 rounded-lg border border-white/10">
                <p className="text-sm text-gray-400">Email</p>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-lg text-white">{email || '—'}</p>
                  {isVerified && <BadgeCheck className="text-blue-400 w-5 h-5" fill="currentColor" />}
                </div>
              </div>

              <div className="p-4 bg-black/20 rounded-lg border border-white/10">
                <p className="text-sm text-gray-400">Account category</p>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-lg text-orange-400">{categoryDisplayName.toUpperCase()}</p>
                </div>
              </div>
            </div>
          </div>

          <form className="p-6 rounded-2xl bg-white/5 border border-white/10" onSubmit={submit}>
            <h2 className="text-2xl font-bold mb-2">Required Details</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Enter your phone number" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Country</label>
                <input value={country} onChange={handleCountryChange} className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Enter your country" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Preferred Payout Method</label>
                <div className="grid grid-cols-2 gap-3">
                  {['MTN','Airtel','Bank','PayPal','visa','mastercard'].map((m) => {
                    const key = m.toLowerCase()
                    const imgSrc = `/images/payout/${key}.jpg`
                    return (
                      <label key={m} className={`p-3 border rounded-lg cursor-pointer flex items-center justify-between transition-colors ${payoutMethod===m? 'border-blue-500 bg-blue-600/20' : 'border-white/10 hover:bg-white/5'}`}>
                        <div className="flex items-center gap-3">
                          {m === 'Bank' ? (
                            <div className="h-8 w-8 flex items-center justify-center bg-white/10 rounded-full">
                              <Landmark className="w-4 h-4 text-white" />
                            </div>
                          ) : (
                            <img src={imgSrc} alt={`${m} logo`} className="h-8 w-8 rounded-full object-cover bg-white" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          )}
                          <span className="font-medium">{m}</span>
                        </div>
                        <input type="radio" name="payout" value={m} checked={payoutMethod===m} onChange={() => setPayoutMethod(m)} className="form-radio h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500" />
                      </label>
                    )
                  })}
                </div>
              </div>
              {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500 text-red-300 text-sm">{error}</div>}
              {success && <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500 text-emerald-300 text-sm">{success}</div>}

              <div className="pt-4">
                <button type="submit" disabled={saving} className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors disabled:opacity-50">{saving ? 'Saving...' : 'Save & Continue'}</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}