'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProtectedRoute } from '@/lib/hooks'
import { getCurrentUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase-client'
import WithdrawChatWidget from '@/components/chat/WithdrawChatWidget'
import PageLoading from '@/components/general/PageLoading'

interface WithdrawalRequestPageProps {
  params: Promise<{ locale: string }>
}

export default function WithdrawalRequestPage({ params }: WithdrawalRequestPageProps) {
  const { locale } = use(params)
  const router = useRouter()
  const { isProtected, loading: authLoading } = useProtectedRoute()
  const [minimumWithdrawal, setMinimumWithdrawal] = useState<number | null>(null)

  useEffect(() => {
    if (!isProtected) return

    const loadMinimumWithdrawal = async () => {
      try {
        const user = await getCurrentUser()
        if (user) {
          const { data: minWithdrawal, error } = await supabase.rpc('get_user_minimum_withdrawal', {
            p_user_id: user.id,
          })

          if (error) {
            console.error('Error fetching minimum withdrawal:', error)
            setMinimumWithdrawal(5000) // Fallback
          } else {
            setMinimumWithdrawal(minWithdrawal ?? 5000)
          }
        } else {
          setMinimumWithdrawal(5000) // Fallback for no user
        }
      } catch (error) {
        console.error('Failed to load minimum withdrawal:', error)
        setMinimumWithdrawal(5000) // Fallback on error
      }
    }

    void loadMinimumWithdrawal()
  }, [isProtected])

  if (authLoading || !isProtected || minimumWithdrawal === null) {
    return <PageLoading />
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <a href={`/${locale}/dashboard/withdrawals`} className="text-sm text-gray-300 hover:text-white">
            {'<-'} Back to Withdrawals
          </a>
        </div>

        <div className="grid md:grid-cols-2 md:gap-12 lg:gap-16">
          <div className="mb-8 md:mb-0">
            <h1 className="text-3xl font-bold mb-2">Withdrawal Request</h1>
            <p className="text-gray-300">
              Follow the guided flow to submit a withdrawal request for processing.
            </p>
          </div>

          <div>
            <WithdrawChatWidget
              locale={locale}
              minimumWithdrawal={minimumWithdrawal}
              onSwitchFlow={(flow) => {
                if (flow === 'upgrade') {
                  router.push(`/${locale}/dashboard/subscription`)
                  return
                }
                if (flow === 'support') {
                  router.push(`/${locale}/support`)
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
