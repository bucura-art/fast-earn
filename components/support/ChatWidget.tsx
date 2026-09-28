'use client'

import { useEffect, useMemo, useState } from 'react'
import UpgradeChatWidget from '@/components/chat/UpgradeChatWidget'
import WithdrawChatWidget from '@/components/chat/WithdrawChatWidget'
import SupportChatWidget from '@/components/chat/SupportChatWidget'
import { supabase } from '@/lib/supabase-client'

type Flow = 'upgrade' | 'withdraw' | 'support' | null

interface ChatWidgetProps {
  initialAction?: string
  initialTier?: string
  locale?: string
  onConversationCreated?: (conversationId: string) => void
}

export default function ChatWidget({ initialAction, initialTier, locale = 'en', onConversationCreated }: ChatWidgetProps) {
  const normalizedInitial = useMemo<Flow>(() => {
    if (initialAction === 'upgrade') return 'upgrade'
    if (initialAction === 'withdraw') return 'withdraw'
    if (initialAction === 'support') return 'support'
    return null
  }, [initialAction])

  const [activeFlow, setActiveFlow] = useState<Flow>(normalizedInitial)
  const [tierPrices, setTierPrices] = useState<Record<string, number>>({})
  const [minWithdrawal, setMinWithdrawal] = useState(5000)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tiersResult, settingsResult] = await Promise.all([
          supabase.from('tiers').select('name, monthly_price'),
          supabase.from('system_settings').select('value').eq('key', 'min_withdrawal').single(),
        ])

        if (tiersResult.data) {
          const prices: Record<string, number> = {}
          tiersResult.data.forEach((t) => {
            if (t.name) prices[t.name] = t.monthly_price
          })
          setTierPrices(prices)
        }

        if (settingsResult.data?.value) {
          setMinWithdrawal(Number(settingsResult.data.value) || 5000)
        }
      } finally {
        setLoading(false)
      }
    }
    void fetchData()
  }, [])

  useEffect(() => {
    setActiveFlow(normalizedInitial)
  }, [normalizedInitial])

  if (!activeFlow) {
    return (
      <div className="w-full max-w-xl mx-auto bg-white/5 p-4 rounded-lg border border-white/10">
        <p className="text-gray-200 mb-3">Choose a chat type:</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveFlow('upgrade')}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-white text-sm"
          >
            Upgrade Account
          </button>
          <button
            onClick={() => setActiveFlow('withdraw')}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-white text-sm"
          >
            Request Withdrawal
          </button>
          <button
            onClick={() => setActiveFlow('support')}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-white text-sm"
          >
            Contact Support
          </button>
        </div>
      </div>
    )
  }

  if (activeFlow === 'upgrade') {
    if (loading) {
      return (
        <div className="w-full max-w-xl mx-auto bg-white/5 p-4 rounded-lg border border-white/10 text-center">
          <p className="text-gray-200 animate-pulse">Loading configuration...</p>
        </div>
      )
    }
    return (
      <UpgradeChatWidget
        initialTier={initialTier}
        locale={locale}
        tierPrices={tierPrices}
        onSwitchFlow={(next) => setActiveFlow(next)}
        onConversationCreated={onConversationCreated}
      />
    )
  }

  if (activeFlow === 'withdraw') {
    if (loading) {
      return (
        <div className="w-full max-w-xl mx-auto bg-white/5 p-4 rounded-lg border border-white/10 text-center">
          <p className="text-gray-200 animate-pulse">Loading configuration...</p>
        </div>
      )
    }
    return (
      <WithdrawChatWidget
        locale={locale}
        minimumWithdrawal={minWithdrawal}
        onSwitchFlow={(next) => setActiveFlow(next)}
        onConversationCreated={onConversationCreated}
      />
    )
  }

  return (
    <SupportChatWidget
      locale={locale}
      onConversationCreated={onConversationCreated}
    />
  )
}
