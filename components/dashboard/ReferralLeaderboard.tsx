'use client'

import { useState, useEffect } from 'react'
import { Trophy, User, Medal } from 'lucide-react'
import { getReferralLeaderboard, getReferralStats } from '@/lib/referral'

interface LeaderboardEntry {
  user_id: string
  full_name: string
  referral_count: number
}

interface ReferralLeaderboardProps {
  currentUserId?: string
}

export default function ReferralLeaderboard({ currentUserId }: ReferralLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [currentUserCount, setCurrentUserCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      setLoading(true)
      setError(false)
      try {
        const [data, stats] = await Promise.all([
          getReferralLeaderboard(10),
          currentUserId ? getReferralStats(currentUserId) : Promise.resolve(null),
        ])

        if (cancelled) return
        setLeaderboard(data || [])
        setCurrentUserCount(stats?.totalReferrals || 0)
      } catch (error) {
        console.error('Failed to load leaderboard', error)
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchData()
    return () => {
      cancelled = true
    }
  }, [currentUserId])

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="w-6 h-6 text-yellow-400" />
      case 1:
        return <Medal className="w-6 h-6 text-gray-300" />
      case 2:
        return <Medal className="w-6 h-6 text-amber-600" />
      default:
        return <span className="w-6 text-center font-bold text-gray-500">{index + 1}</span>
    }
  }

  // Check if current user is in the top list
  const currentUserRankIndex = leaderboard.findIndex(u => u.user_id === currentUserId)
  const isCurrentUserInTop = currentUserRankIndex !== -1

  return (
    <section aria-labelledby="referral-leaderboard-heading" className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-5">
        <div className="rounded-lg bg-emerald-500/20 p-2">
          <Trophy className="w-6 h-6 text-emerald-400" />
        </div>
        <h2 id="referral-leaderboard-heading" className="text-sm font-semibold tracking-wider text-gray-300">
          Top Referrers
        </h2>
      </div>

      {loading ? (
        <div className="py-8 text-center text-gray-400">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
          Loading top referrers...
        </div>
      ) : error ? (
        <p role="alert" className="py-8 text-center text-red-300">Unable to load.</p>
      ) : (
        <>
          {currentUserId && (
            <div className="mb-4 rounded-xl border border-white/10 bg-linear-to-r from-blue-900/40 to-emerald-900/40 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-blue-400 bg-blue-600 font-bold text-white">
                    You
                  </div>
                  <div>
                    <p className="text-xs text-blue-300">
                      {isCurrentUserInTop ? `Rank #${currentUserRankIndex + 1}` : 'Keep inviting to rank up!'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block text-2xl font-bold text-emerald-400">{currentUserCount}</span>
                </div>
              </div>
            </div>
          )}

          <div className="max-h-28rem space-y-2 overflow-y-auto pr-1">
            {leaderboard.length === 0 ? (
              <p className="py-8 text-center text-gray-500">No referrals yet. Be the first!</p>
            ) : (
              leaderboard.map((user, index) => (
                <div
                  key={user.user_id}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    user.user_id === currentUserId
                      ? 'border-blue-500/50 bg-blue-600/20'
                      : 'border-white/5 bg-white/5 hover:bg-white/10'
                  } transition-colors`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex w-8 items-center justify-center">
                      {getRankIcon(index)}
                    </div>
                    <span className={`font-medium ${user.user_id === currentUserId ? 'text-blue-200' : 'text-gray-200'}`}>
                      {user.full_name || 'Anonymous'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-white">{user.referral_count}</span>
                    <User className="h-4 w-4 text-gray-500" />
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </section>
  )
}