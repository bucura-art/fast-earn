"use client"

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Gift, Users, CalendarCheck, CheckSquare, PlayCircle, Package } from 'lucide-react'
import { useProtectedRoute } from '@/lib/hooks'
import { getCurrentUser } from '@/lib/auth'
import LanguageSwitcher from '@/components/general/LanguageSwitcher'
import PageLoading from '@/components/general/PageLoading'
import SiteHeader from '@/components/general/SiteHeader'
import EarnersLeaderboard from '@/components/dashboard/EarnersLeaderboard'
import supabase from '@/lib/supabaseClient'

interface DashboardPageProps {
  params: Promise<{ locale: string }>
}

const incomeSources = [
  { key: 'bonus_income', label: 'Bonus', icon: Gift, color: 'text-amber-400' },
  { key: 'referral_income', label: 'Referral', icon: Users, color: 'text-purple-400' },
  { key: 'check_in_income', label: 'Check-in', icon: CalendarCheck, color: 'text-cyan-400' },
  { key: 'task_income', label: 'Tasks', icon: CheckSquare, color: 'text-emerald-400' },
  { key: 'video_income', label: 'Videos', icon: PlayCircle, color: 'text-rose-400' },
  { key: 'products_income', label: 'Products', icon: Package, color: 'text-indigo-300' },
] as const

interface IncomeBreakdown {
  total_income: number
  bonus_income: number
  referral_income: number
  check_in_income: number
  task_income: number
  video_income: number
  products_income: number
}

const emptyIncomeBreakdown: IncomeBreakdown = {
  total_income: 0,
  bonus_income: 0,
  referral_income: 0,
  check_in_income: 0,
  task_income: 0,
  video_income: 0,
  products_income: 0,
}

export default function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = use(params)
  const router = useRouter()
  const { isProtected } = useProtectedRoute()
  const [incomeBreakdown, setIncomeBreakdown] = useState<IncomeBreakdown | null>(null)
  const [hideBalance, setHideBalance] = useState(false)
  const [showLanguageSwitcher, setShowLanguageSwitcher] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isProtected) return

    const loadUserData = async () => {
      try {
        const currentUser = await getCurrentUser()

        if (currentUser?.is_suspended) {
          router.replace(`/${locale}/checkpoint`)
          return
        }

        if (currentUser) {
          const incomeResult = await supabase.rpc('get_user_income_breakdown')
          if (incomeResult.error) {
            console.error('Error loading income breakdown:', incomeResult.error)
          } else {
            const incomeValues = Array.isArray(incomeResult.data) ? incomeResult.data[0] : incomeResult.data
            setIncomeBreakdown(incomeValues || emptyIncomeBreakdown)
          }
        }
      } catch (error) {
        console.error('Error loading dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [isProtected, locale, router])

  if (!isProtected || loading) {
    return (
      <div className="flex min-h-screen flex-col bg-linear-to-b from-slate-900 via-indigo-950 to-slate-900 text-white">
        <SiteHeader locale={locale} onChangeLanguage={() => setShowLanguageSwitcher(true)} />
        <PageLoading className="min-h-0 flex-1" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-900 via-indigo-950 to-slate-900 pb-20 text-white md:pb-0">
      <SiteHeader locale={locale} onChangeLanguage={() => setShowLanguageSwitcher(true)} />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-4xl font-bold">Dashboard</h1>
          <button
            type="button"
            className="rounded bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-500"
          >
            All-Time
          </button>
        </div>


        <div className="grid items-start gap-6 lg:grid-cols-3">
          {/* Income */}
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 relative">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-gray-400 text-sm">Total Income</p>
                </div>
                <p className="text-3xl font-bold">
                  {hideBalance
                    ? '••••••'
                    : incomeBreakdown
                      ? `${Number(incomeBreakdown.total_income).toLocaleString()} RWF`
                      : '—'}
                </p>
              </div>
              <button
                onClick={() => setHideBalance((s) => !s)}
                className="ml-4 text-gray-300 hover:text-white transition-colors"
                aria-label="Toggle income visibility"
              >
                {hideBalance ? <Eye size={25} /> : <EyeOff size={20} />}
              </button>
            </div>

            <div className="mt-6 border-t border-white/10 pt-5">
              <h2 className="mb-4 text-sm font-semibold tracking-wider text-gray-400">Income sources</h2>
              <div className="grid gap-4 2xl:grid-cols-2">
                {incomeSources.map(({ key, label, icon: Icon, color }) => (
                  <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Icon className={color} size={18} />
                      <span className="text-sm text-gray-300">{label}</span>
                    </div>
                    <span className="text-sm font-semibold text-white">
                      {hideBalance
                        ? '••••'
                        : incomeBreakdown
                          ? `${Number(incomeBreakdown[key]).toLocaleString()} RWF`
                          : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <EarnersLeaderboard />
        </div>

      </div>

      {/* Language Switcher Modal */}
      {showLanguageSwitcher && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-linear-to-b from-slate-900 to-indigo-950 rounded-2xl border border-white/10 p-6 max-w-sm w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">Change Language</h2>
            <LanguageSwitcher />
            <button
              onClick={() => setShowLanguageSwitcher(false)}
              className="w-full mt-4 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
