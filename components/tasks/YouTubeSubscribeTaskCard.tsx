// d:\FACTORY\fast-earn\components\YouTubeSubscribeTaskCard.tsx

"use client"

import { useEffect, useState } from 'react'
import { Task } from '@/lib/types'
import { Youtube } from 'lucide-react'

interface YouTubeSubscribeTaskCardProps {
  task: Task
  reward: number
  actionButton: React.ReactNode
}

declare global {
  interface Window {
    gapi?: any
  }
}

export default function YouTubeSubscribeTaskCard({ task, reward, actionButton }: YouTubeSubscribeTaskCardProps) {
  const [channelId, setChannelId] = useState<string | null>(null)
  const [channelName, setChannelName] = useState<string | null>(null)

  useEffect(() => {
    // Load Google API platform script if not present
    if (!document.querySelector('script[src="https://apis.google.com/js/platform.js"]')) {
      const script = document.createElement('script')
      script.src = 'https://apis.google.com/js/platform.js'
      script.async = true
      script.defer = true
      document.body.appendChild(script)
      script.onload = () => {
        // Re-render widgets when script loads
        if (window.gapi?.ytsubscribe) {
          window.gapi.ytsubscribe.go()
        }
      }
    } else if (window.gapi?.ytsubscribe) {
      // If script is already loaded, try to render immediately (with a small delay for DOM)
      setTimeout(() => {
        window.gapi.ytsubscribe.go()
      }, 500)
    }

    if (task.external_url) {
      try {
        const url = new URL(task.external_url)
        // Extract Channel ID (e.g. /channel/UC...)
        if (url.pathname.includes('/channel/')) {
          const id = url.pathname.split('/channel/')[1].split('/')[0]
          setChannelId(id)
        } 
        // Extract Legacy Username (e.g. /user/username)
        else if (url.pathname.includes('/user/')) {
          const name = url.pathname.split('/user/')[1].split('/')[0]
          setChannelName(name)
        }
        // Note: @handles are not directly supported by the legacy widget without an API lookup
      } catch (e) {
        console.error("Error parsing YouTube URL", e)
      }
    }
  }, [task.external_url])

  return (
    <div className="p-6 rounded-2xl bg-gradient-to-br from-red-900/20 to-slate-900/20 border border-white/10 hover:border-red-500/30 transition-colors flex flex-col overflow-hidden">
      <div className="mb-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-lg shrink-0">
          <Youtube className="text-white" size={28} />
        </div>
        <div className="overflow-hidden flex-1">
          <h3 className="text-lg font-bold leading-tight truncate">{task.title}</h3>
          <p className="text-red-200/70 text-xs font-medium uppercase tracking-wider mt-1">YouTube Channel</p>
        </div>
      </div>

      {/* Official Subscribe Button Embed (only works if ID or Legacy Name is available) */}
      {(channelId || channelName) && (
         <div className="mb-6 flex justify-center min-h-[50px] items-center bg-black/20 rounded-lg p-2 overflow-hidden">
            <div
              className="g-ytsubscribe"
              data-channelid={channelId || undefined}
              data-channel={channelName || undefined}
              data-layout="full"
              data-theme="dark"
              data-count="default"
            ></div>
         </div>
      )}

      <p className="text-gray-300 text-sm mb-6 flex-grow break-words">{task.description}</p>

      <div className="space-y-2 mb-6 pb-6 border-b border-white/10">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Reward:</span>
          <span className="text-emerald-400 font-bold">{reward.toLocaleString()} RWF</span>
        </div>
      </div>

      {actionButton}
    </div>
  )
}
