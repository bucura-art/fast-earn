'use client'

import { Medal, Trophy, User } from 'lucide-react'

const topEarners = [
  { id: 'earner-1', name: 'Aline M.', amount: 125000 },
  { id: 'earner-2', name: 'Jean K.', amount: 98500 },
  { id: 'earner-3', name: 'Marie U.', amount: 76400 },
  { id: 'earner-4', name: 'Eric N.', amount: 58300 },
  { id: 'earner-5', name: 'Diane A.', amount: 42100 },
]

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

export default function EarnersLeaderboard() {
  return (
    <section aria-labelledby="earners-leaderboard-heading" className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-5">
        <div className="rounded-lg bg-emerald-500/20 p-2">
          <Trophy className="h-6 w-6 text-emerald-400" />
        </div>
        <h2 id="earners-leaderboard-heading" className="text-sm font-semibold tracking-wider text-gray-300">
          Top Earners
        </h2>
      </div>

      <div className="space-y-2">
        {topEarners.map((earner, index) => (
          <div
            key={earner.id}
            className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-3 transition-colors hover:bg-white/10"
          >
            <div className="flex items-center gap-4">
              <div className="flex w-8 items-center justify-center">
                <RankIcon index={index} />
              </div>
              <span className="font-medium text-gray-200">{earner.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white">
                {earner.amount.toLocaleString('en-GB')} RWF
              </span>
              <User className="h-4 w-4 shrink-0 text-gray-500" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}