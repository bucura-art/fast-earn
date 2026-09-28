'use client'

import { useEffect, useRef, useState, type ComponentType } from 'react'
import { Bell, Gift, TrendingUp, Wallet } from 'lucide-react'
import type { ActivityNotification } from '@/lib/data/activityNotifications'

interface FloatingActivityAlertsProps {
  items: ActivityNotification[]
  autoRotateMs?: number
  position?: 'bottom-left' | 'bottom-right'
}

const typeStyles: Record<ActivityNotification['type'], { label: string; className: string }> = {
  withdrawal: {
    label: 'Withdrawal',
    className: 'text-emerald-200 bg-emerald-500/20 border-emerald-300/20',
  },
  upgrade: {
    label: 'Upgrade',
    className: 'text-blue-200 bg-blue-500/20 border-blue-300/20',
  },
  bonus: {
    label: 'Bonus',
    className: 'text-amber-200 bg-amber-500/20 border-amber-300/20',
  },
  general: {
    label: 'Update',
    className: 'text-slate-200 bg-slate-500/20 border-slate-300/20',
  },
}

const typeIcons: Record<ActivityNotification['type'], ComponentType<{ size?: number; className?: string }>> = {
  withdrawal: Wallet,
  upgrade: TrendingUp,
  bonus: Gift,
  general: Bell,
}

export default function FloatingActivityAlerts({
  items,
  autoRotateMs = 5000,
  position = 'bottom-left',
}: FloatingActivityAlertsProps) {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (items.length <= 1) return

    const interval = setInterval(() => {
      setVisible(false)

      timeoutRef.current = setTimeout(() => {
        setIndex((prev) => (prev + 1) % items.length)
        setVisible(true)
      }, 280)
    }, autoRotateMs)

    return () => {
      clearInterval(interval)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [autoRotateMs, items.length])

  if (items.length === 0) return null

  const item = items[index]
  const tone = typeStyles[item.type]
  const Icon = typeIcons[item.type]
  const positionClass = position === 'bottom-right' ? 'right-4 md:right-8' : 'left-4 md:left-8'

  return (
    <div className={`fixed bottom-4 md:bottom-8 ${positionClass} z-50 pointer-events-none`}>
      <div
        className={`max-w-sm pointer-events-auto transition-all duration-300 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
      >
        <div className="bg-slate-900/95 border border-white/10 shadow-2xl backdrop-blur-md px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs border ${tone.className}`}>
              <Icon size={14} />
              {tone.label}
            </span>
            <span className="text-[11px] text-slate-400">Live</span>
          </div>
          <p className="text-sm text-slate-100">{item.message}</p>
        </div>
      </div>
    </div>
  )
}
