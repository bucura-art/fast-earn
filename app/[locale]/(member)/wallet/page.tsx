"use client"

import { use } from 'react'

import { useState, useEffect } from 'react'
import PageLoading from '@/components/general/PageLoading'
import SiteHeader from '@/components/general/SiteHeader'
import { useProtectedRoute } from '@/lib/hooks'
import { getCurrentUser } from '@/lib/auth'
import { getBalance, getWalletTransactions } from '@/lib/reward'
import { WalletTransaction } from '@/lib/types'

interface WalletPageProps {
  params: Promise<{ locale: string }>
}

export default function WalletPage({ params }: WalletPageProps) {
  const { locale } = use(params)
  const { isProtected } = useProtectedRoute()
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isProtected) return

    const loadWalletData = async () => {
      try {
        const user = await getCurrentUser()
        if (user) {
          const userBalance = await getBalance(user.id)
          setBalance(userBalance)

          const recentTransactions = await getWalletTransactions(user.id, 100)
          setTransactions(recentTransactions)
        }
      } catch (error) {
        console.error('Error loading wallet:', error)
      } finally {
        setLoading(false)
      }
    }

    loadWalletData()
  }, [isProtected])

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-linear-to-b from-slate-900 via-indigo-950 to-slate-900 text-white">
        <SiteHeader locale={locale} />
        <PageLoading className="min-h-0 flex-1" />
      </div>
    )
  }

  const creditTransactions = transactions.filter((tx) => tx.type === 'credit')
  const debitTransactions = transactions.filter((tx) => tx.type === 'debit')

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-900 via-indigo-950 to-slate-900 pb-24 text-white md:pb-8">
      <SiteHeader locale={locale} />
      <div className="container mx-auto px-4 pt-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold">Wallet</h1>
          <a href={`/${locale}/wallet/withdrawals`} className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 rounded text-white font-bold">Withdraw</a>
        </div>

        {/* Balance Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="p-8 rounded-2xl bg-linear-to-br from-blue-900/40 to-indigo-900/20 border border-blue-500/30">
            <p className="text-gray-300 text-sm mb-2">Current Balance</p>
            <p className="text-4xl font-extrabold text-blue-400">{balance.toLocaleString()}</p>
            <p className="text-blue-300 text-sm mt-2">RWF</p>
          </div>
          <div className="p-8 rounded-2xl bg-linear-to-br from-purple-900/40 to-pink-900/20 border border-purple-500/30">
            <p className="text-gray-300 text-sm mb-2">Pending Withdrawal</p>
            <p className="text-4xl font-extrabold text-purple-400">
              {debitTransactions
                .filter((tx) => tx.reference_type === 'withdrawal')
                .reduce((sum, tx) => sum + tx.amount, 0)
                .toLocaleString()}
            </p>
            <p className="text-purple-300 text-sm mt-2">RWF</p>
          </div>
        </div>

        {/* Transactions */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* Withdrawals */}
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <h2 className="text-base font-semibold mb-6">Recent Withdrawals</h2>
            {debitTransactions.filter((tx) => tx.reference_type === 'withdrawal').length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {debitTransactions
                  .filter((tx) => tx.reference_type === 'withdrawal')
                  .map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-4 bg-red-900/20 rounded-lg border border-red-500/20">
                      <div>
                        <p className="font-medium">Withdrawal</p>
                        <p className="text-gray-400 text-sm">{new Date(tx.created_at).toLocaleDateString()}</p>
                      </div>
                      <p className="text-red-400 font-bold">-{tx.amount.toLocaleString()} RWF</p>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-400">No withdrawal transactions yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
