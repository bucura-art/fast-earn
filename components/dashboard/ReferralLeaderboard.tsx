'use client'

import { useState, useEffect } from 'react'
import { X, Trophy, User, Medal } from 'lucide-react'
import { getReferralLeaderboard, getReferralStats } from '@/lib/referral'

interface LeaderboardEntry {
  user_id: string
  full_name: string
  referral_count: number
}

interface ReferralLeaderboardProps {
  isOpen: boolean
  onClose: () => void
  currentUserId?: string
}

export default function ReferralLeaderboard({ isOpen, onClose, currentUserId }: ReferralLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [currentUserCount, setCurrentUserCount] = useState<number>(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen, currentUserId])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch top 20
      const data = await getReferralLeaderboard(20)
      setLeaderboard(data || [])

      // Fetch current user stats if logged in
      if (currentUserId) {
        const stats = await getReferralStats(currentUserId)
        setCurrentUserCount(stats.totalReferrals || 0)
      }
    } catch (error) {
      console.error('Failed to load leaderboard', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col border border-white/10 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Trophy className="w-6 h-6 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Referral Leaderboard</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-0 flex-grow custom-scrollbar">
          {loading ? (
            <div className="p-8 text-center text-gray-400">
              <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              Loading top referrers...
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Current User Stats (Sticky-ish feel at top of list) */}
              {currentUserId && (
                <div className="bg-gradient-to-r from-blue-900/40 to-emerald-900/40 border-b border-white/10 p-4 sticky top-0 backdrop-blur-md z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold border-2 border-blue-400">
                        You
                      </div>
                      <div>
                        <p className="text-white font-bold">Your Performance</p>
                        <p className="text-xs text-blue-300">
                          {isCurrentUserInTop 
                            ? `Rank #${currentUserRankIndex + 1}` 
                            : 'Keep inviting to rank up!'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="block text-2xl font-bold text-emerald-400">{currentUserCount}</span>
                      <span className="text-[10px] uppercase tracking-wider text-gray-400">Referrals</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Leaderboard List */}
              <div className="p-4 space-y-2">
                {leaderboard.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No referrals yet. Be the first!</p>
                ) : (
                  leaderboard.map((user, index) => (
                    <div 
                      key={user.user_id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        user.user_id === currentUserId 
                          ? 'bg-blue-600/20 border-blue-500/50' 
                          : 'bg-white/5 border-white/5 hover:bg-white/10'
                      } transition-colors`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8">
                          {getRankIcon(index)}
                        </div>
                        <div className="flex flex-col">
                          <span className={`font-medium ${user.user_id === currentUserId ? 'text-blue-200' : 'text-gray-200'}`}>
                            {user.full_name || 'Anonymous'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-white">{user.referral_count}</span>
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}