"use client"

import Image from 'next/image'
import { AlertCircle } from 'lucide-react'
import { Task } from '@/lib/types'
import { ReactNode, useState } from 'react'

interface TaskCardProps {
  task: Task
  userTier: string
  children?: ReactNode
}

export default function TaskCard({ task, userTier, children }: TaskCardProps) {
  const [isUnoptimized, setIsUnoptimized] = useState(false)

  const getTaskImage = (category: string) => {
    switch (category.toLowerCase()) {
      case 'subscribe':
        return '/images/tasks/subscribe.jpg'
      case 'follow':
        return '/images/tasks/follow.jpg'
      case 'install':
        return '/images/tasks/install.jpg'
      case 'click':
      default:
        return '/images/tasks/click.jpg'
    }
  }

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors flex flex-col overflow-hidden">
      <div className="relative w-full h-40 bg-gray-800">
        <Image
          src={getTaskImage(task.category)}
          alt={task.category}
          width={600}
          height={300}
          className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
          unoptimized={isUnoptimized}
          onError={() => setIsUnoptimized(true)}
        />
      </div>

      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-xl font-bold mb-2 flex-grow break-words">{task.title}</h3>
        <p className="text-gray-400 text-sm mb-4 break-words">{task.description}</p>

        {(task as any).is_upsell && (
          <div className="mb-4 p-2 bg-amber-900/20 border border-amber-500/30 rounded text-xs text-amber-200 flex items-center gap-2">
            <AlertCircle size={14} />
            You cannot complete this task on {userTier} account
          </div>
        )}

        <div className="space-y-2 mb-6 pb-6 border-b border-white/10">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Reward:</span>
            <span className="text-emerald-400 font-bold">{task.base_reward} RWF</span>
          </div>
        </div>

        <div className="space-y-2 mt-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
