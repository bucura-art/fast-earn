"use client"

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Copy, BadgeCheck, User as UserIcon, Wallet, Users, Target, Trophy } from 'lucide-react'
import { useProtectedRoute } from '@/lib/hooks'
import { getCurrentUser } from '@/lib/auth'
import { getBalance, getWalletTransactions } from '@/lib/reward'
import { getTodayTaskCount } from '@/lib/tasks'
import { getDailyTaskLimit, getUserSubscription, getTierNameFromSubscription } from '@/lib/subscription'
import { User, WalletTransaction } from '@/lib/types'
import CopyButton from '@/components/general/CopyButton'
import LanguageSwitcher from '@/components/general/LanguageSwitcher'
import PageLoading from '@/components/general/PageLoading'
import SiteHeader from '@/components/general/SiteHeader'
import ReferralLeaderboard from '@/components/dashboard/ReferralLeaderboard'
import supabase from '@/lib/supabaseClient'
import { generateReferralLink } from '@/lib/referral'

interface DashboardPageProps {
  params: Promise<{ locale: string }>
}

export default function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = use(params)
  const router = useRouter()
  const { user: authUser, isProtected } = useProtectedRoute()
  const [user, setUser] = useState<User | null>(null)
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [hideBalance, setHideBalance] = useState(false)
  const [showLanguageSwitcher, setShowLanguageSwitcher] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dailyLimit, setDailyLimit] = useState(5)
  const [todayCount, setTodayCount] = useState(0)

  useEffect(() => {
    if (!isProtected) return

    const loadUserData = async () => {
      try {
        const currentUser = await getCurrentUser()

        if (currentUser?.is_suspended) {
          router.replace(`/${locale}/checkpoint`)
          return
        }

        setUser(currentUser)

        if (currentUser) {
          const [userBalance, recentTransactions, todayCountVal, subscription, tierData] = await Promise.all([
            getBalance(currentUser.id),
            getWalletTransactions(currentUser.id, 10),
            getTodayTaskCount(currentUser.id),
            getUserSubscription(currentUser.id),
            currentUser.tier_id ? supabase.from('tiers').select('name').eq('id', currentUser.tier_id).maybeSingle() : Promise.resolve({ data: null })
          ])

          setBalance(userBalance)
          setTransactions(recentTransactions)
          setTodayCount(todayCountVal)

          const tierName = (tierData.data?.name as any) || getTierNameFromSubscription(subscription)
          setDailyLimit(getDailyTaskLimit(tierName))

          if (process.env.NODE_ENV === 'development') {
            console.log('Dashboard loaded:', { tierName, limit: getDailyTaskLimit(tierName), subscription })
          }
        }
      } catch (error) {
        console.error('Error loading dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [isProtected])

  if (!isProtected || loading) {
    return <PageLoading />
  }

  const firstName = user?.full_name?.split(' ')[0] || ''
  const displayName = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase() : ''

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 pb-20 text-white md:pb-0">
      <SiteHeader locale={locale} onChangeLanguage={() => setShowLanguageSwitcher(true)} />

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-black flex items-center justify-center text-xl font-bold shadow-lg border border-white/10">
              <UserIcon size={25} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold flex items-center gap-2">
              {displayName}
              {user?.is_verified && (
                <BadgeCheck className="text-blue-400 w-6 h-6" fill="currentColor" stroke="white" />
              )}
            </h1>
          </div>
        </div>


        {/* Balance */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 relative">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="text-blue-400" size={18} />
                  <p className="text-gray-400 text-sm">Balance</p>
                </div>
                <p className="text-3xl font-bold">{hideBalance ? '••••••' : `${balance.toLocaleString()} RWF`}</p>
              </div>
              <button
                onClick={() => setHideBalance((s) => !s)}
                className="ml-4 text-gray-300 hover:text-white transition-colors"
                aria-label="Toggle balance visibility"
              >
                {hideBalance ? <Eye size={25} /> : <EyeOff size={20} />}
              </button>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="text-purple-400" size={18} />
                <p className="text-gray-400 text-sm">From Referrals</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowLeaderboard(true)}
                  className="text-blue-300 hover:text-white transition-colors"
                  aria-label="Open leaderboard"
                >
                  <Trophy size={30} />
                </button>
                <CopyButton
                  textToCopy={user ? generateReferralLink(user.id) : ''}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  <Copy size={25} />
                </CopyButton>
              </div>
            </div>
            <p className="text-3xl font-bold">{(user?.referral_earnings || 0).toLocaleString()} RWF</p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex justify-between items-end mb-3">
              <div className="flex items-center gap-2">
                <Target className="text-emerald-400" size={24} />
                <h2 className="text-xl font-bold text-white">Today Tasks</h2>
              </div>
              <div className="text-right">
                <span className={`text-3xl font-bold ${todayCount >= dailyLimit ? 'text-emerald-400' : 'text-white'}`}>{todayCount}</span>
                <span className="text-blue-300 text-lg">/{dailyLimit}</span>
              </div>
            </div>
            
            <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${todayCount >= dailyLimit ? 'bg-emerald-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min(100, (todayCount / dailyLimit) * 100)}%` }}
              />
            </div>
            <h3 className="mt-2 text-xs text-blue-300 text-right">{todayCount >= dailyLimit ? 'Daily limit reached!' : `${dailyLimit - todayCount} tasks remaining`}</h3>
          </div>
        </div>

      </div>

      {/* Language Switcher Modal */}
      {showLanguageSwitcher && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-slate-900 to-indigo-950 rounded-2xl border border-white/10 p-6 max-w-sm w-full shadow-2xl">
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

      {/* Referral Leaderboard Modal */}
      <ReferralLeaderboard
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        currentUserId={user?.id}
      />
    </div>
  )
}
