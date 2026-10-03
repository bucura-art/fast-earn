'use client'

import { useCallback, useEffect, useState } from 'react'
import { Medal, Trophy, User } from 'lucide-react'
import { useAdminRoute } from '@/lib/hooks'
import supabase from '@/lib/supabaseClient'

interface TopEarner {
  user_id: string
  full_name: string | null
  total_earned: number
}

function RankIcon({ index }: { index: number }) {
  switch (index) {
    case 0:
      return <Trophy className="h-6 w-6 text-yellow-400" />
    case 1:
      return <Medal className="h-6 w-6 text-gray-300" />
    case 2:
      return <Medal className="h-6 w-6 text-amber-600" />
    default:
      return <span className="w-6 text-center font-bold text-gray-500">{index + 1}</span>
  }
}

export default function TheTopEarners() {
  const { isProtected } = useAdminRoute()
  const [earners, setEarners] = useState<TopEarner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadEarners = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabase.rpc('get_admin_top_earners')
      if (rpcError) throw rpcError

      setEarners(
        (data || []).map((earner: TopEarner) => ({
          ...earner,
          total_earned: Number(earner.total_earned || 0),
        })),
      )
    } catch (loadError) {
      console.error('Error loading admin top earners:', loadError)
      setError('Unable to load top earners.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isProtected) void loadEarners()
  }, [isProtected, loadEarners])

  return (
    <section aria-labelledby="admin-top-earners-heading" className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-5">
        <div className="rounded-lg bg-emerald-500/20 p-2">
          <Trophy className="h-6 w-6 text-emerald-400" />
        </div>
        <h2 id="admin-top-earners-heading" className="text-sm font-semibold tracking-wider text-gray-300">
          Top Earners
        </h2>
      </div>

      {loading ? (
        <p className="py-8 text-center text-gray-400">Loading top earners...</p>
      ) : error ? (
        <div role="alert" className="py-6 text-center">
          <p className="mb-3 text-red-300">{error}</p>
          <button type="button" onClick={loadEarners} className="text-sm font-semibold text-emerald-300 underline">
            Retry
          </button>
        </div>
      ) : earners.length === 0 ? (
        <p className="py-8 text-center text-gray-500">No earning data available yet.</p>
      ) : (
        <div className="space-y-2">
          {earners.map((earner, index) => (
            <div
              key={earner.user_id}
              className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-3 transition-colors hover:bg-white/10"
            >
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex w-8 shrink-0 items-center justify-center">
                  <RankIcon index={index} />
                </div>
                <span className="truncate font-medium text-gray-200">{earner.full_name || 'Anonymous'}</span>
              </div>
              <div className="ml-3 flex shrink-0 items-center gap-2">
                <span className="text-lg font-bold text-white">
                  {earner.total_earned.toLocaleString('en-GB')} RWF
                </span>
                <User className="h-4 w-4 text-gray-500" />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}