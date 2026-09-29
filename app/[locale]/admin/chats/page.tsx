'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useAdminRoute } from '@/lib/hooks'
import AdminLoading from '@/components/admin/AdminPageLoading'
import { MessageSquare, Clock } from 'lucide-react'

interface Conversation {
  id: string
  user_id: string
  users?: { username?: string; full_name?: string; email?: string }
  subject: string
  status: 'open' | 'closed'
  assigned_to?: string
  is_read?: boolean
  created_at: string
}

function getConversationUsername(conversation: Conversation) {
  const username = conversation.users?.username?.trim()
  if (username) return username

  const fullName = conversation.users?.full_name?.trim()
  if (fullName) return fullName

  const email = conversation.users?.email?.trim()
  if (email) return email.split('@')[0]

  return 'Unknown User'
}

function getAvatarInitial(name: string) {
  return name.charAt(0).toUpperCase() || 'U'
}

export default function AdminChatsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  const { isProtected } = useAdminRoute()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isProtected) return
    loadConversations()
    const interval = setInterval(loadConversations, 5000) // Poll every 5 seconds
    return () => clearInterval(interval)
  }, [isProtected])

  async function loadConversations() {
    try {
      const res = await fetch('/api/conversations?status=open&type=support')
      const { conversations } = await res.json()
      setConversations(conversations || [])
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  async function closeConversation(id: string) {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      })
      if (!res.ok) throw new Error('Failed to close conversation')
      setConversations(conversations.filter((c) => c.id !== id))
    } catch (error) {
      console.error('Error closing conversation:', error)
    }
  }

  if (loading) {
    return <AdminLoading />
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-emerald-950 to-slate-900 text-white py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Support Chats</h1>
          <p className="text-gray-300">Respond to user support messages</p>
        </div>

        {conversations.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-blue-400" />
            <p className="text-gray-300">No open conversations</p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conv) => {
              const username = getConversationUsername(conv)
              const avatarInitial = getAvatarInitial(username)
              const hasCustomSubject = Boolean(conv.subject && conv.subject !== 'Support request')

              return (
                <Link key={conv.id} href={`/${locale}/admin/chats/${conv.id}`}>
                <div className={`p-4 rounded-xl border transition cursor-pointer ${
                  !conv.is_read
                    ? 'bg-blue-600/20 border-blue-400/40 hover:bg-blue-600/30'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}>
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="h-10 w-10 shrink-0 rounded-full border border-emerald-400/40 bg-emerald-500/20 text-sm font-bold text-emerald-200 flex items-center justify-center">
                        {avatarInitial}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-lg font-semibold text-white">{username}</h3>
                          {!conv.is_read && (
                            <span className="shrink-0 px-2 py-0.5 bg-blue-500 text-white rounded text-xs font-bold">NEW</span>
                          )}
                        </div>
                        {hasCustomSubject && (
                          <div className="truncate text-xs text-gray-400">{conv.subject}</div>
                        )}
                        <div className="truncate text-sm text-gray-400 mt-1">{conv.users?.email || ''}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 space-y-2">
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          conv.status === 'open' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'
                        }`}>
                          {conv.status.toUpperCase()}
                        </span>
                      </div>
                      <span className="mt-2 inline-flex items-center justify-end gap-1 text-xs font-medium text-gray-400">
                        <Clock className="w-3 h-3" />
                        {new Date(conv.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
