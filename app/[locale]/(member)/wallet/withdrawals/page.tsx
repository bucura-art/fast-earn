"use client"

import { use, useState, useEffect } from 'react'
import { useProtectedRoute } from '@/lib/hooks'
import { getCurrentUser } from '@/lib/auth'
import { getBalance } from '@/lib/reward'
import PageLoading from '@/components/general/PageLoading'
import { supabase } from '@/lib/supabase-client'

interface WithdrawalsPageProps {
  params: Promise<{ locale: string }>
}

export default function WithdrawalsPage({ params }: WithdrawalsPageProps) {
  const { locale } = use(params)
  const { isProtected } = useProtectedRoute()
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [minimumWithdrawal, setMinimumWithdrawal] = useState(5000)

  useEffect(() => {
    if (!isProtected) return

    const loadData = async () => {
      try {
        const user = await getCurrentUser()
        if (user) {
          const userBalance = await getBalance(user.id)
          setBalance(userBalance)

          // Fetch user-specific minimum withdrawal from the database
          const { data: minWithdrawal, error } = await supabase.rpc('get_user_minimum_withdrawal', {
            p_user_id: user.id,
          })

          if (error) {
            console.error('Error fetching minimum withdrawal:', error)
          } else if (minWithdrawal) {
            setMinimumWithdrawal(minWithdrawal)
          }
        }
      } catch {
        // No-op; page can still render available data
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [isProtected])

  if (loading) {
    return <PageLoading />
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-900 via-indigo-950 to-slate-900 text-white py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mt-4 mb-6">
          <a href={`/${locale}/wallet`} className="text-sm text-gray-300 hover:text-white">{'<-'} Back</a>
        </div>

        <h1 className="text-4xl font-bold mb-8">Withdraw Funds</h1>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Withdrawal Summary */}
          <div className="p-8 rounded-2xl bg-white/5 border border-white/10">
            <h2 className="text-2xl font-bold mb-6">Withdrawal Summary</h2>
            <div className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm">Available Balance</p>
                <p className="text-4xl font-bold text-emerald-400">{balance.toLocaleString()} RWF</p>
              </div>
              <div className="border-t border-white/10"></div>
              <div>
                <p className="text-gray-400 text-sm">Minimum for Withdrawal</p>
                <p className="text-xl font-semibold text-blue-300">{minimumWithdrawal.toLocaleString()} RWF</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Status</p>
                <p className={`text-xl font-bold ${balance >= minimumWithdrawal ? 'text-green-400' : 'text-red-400'}`}>
                  {balance >= minimumWithdrawal ? 'Eligible for Withdrawal' : 'Balance Too Low'}
                </p>
              </div>
            </div>
          </div>

          {/* Withdrawal Action */}
          <div className="p-8 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Withdraw?</h2>
            <p className="text-gray-300 mb-6">Click the button below to start the withdrawal process. You will be guided to provide your payment details.</p>
            <button
              onClick={() => window.location.assign(`/${locale}/dashboard/withdrawals/request`)}
              disabled={balance < minimumWithdrawal}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              Request Withdrawal
            </button>
            {balance < minimumWithdrawal && (
              <p className="text-center text-red-400 text-sm mt-4">
                You need at least {minimumWithdrawal.toLocaleString()} RWF to make a withdrawal.
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
