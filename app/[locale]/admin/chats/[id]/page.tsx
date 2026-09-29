"use client"

import { useState, useEffect, use } from 'react'
import { useAdminRoute } from '@/lib/hooks'
import AdminLoading from '@/components/admin/AdminPageLoading'
import { Send, X } from 'lucide-react'

interface Message {
  id: string
  sender_role: 'user' | 'admin' | 'system'
  sender_id?: string
  content: string
  message_type: 'text' | 'suggested' | 'system' | 'action'
  created_at: string
}

interface Conversation {
  id: string
  user_id: string
  users?: { username?: string; full_name?: string; email?: string }
  subject: string
  status: 'open' | 'closed'
  created_at: string
}

function getConversationUsername(conversation: Conversation | null) {
  const username = conversation?.users?.username?.trim()
  if (username) return username

  const fullName = conversation?.users?.full_name?.trim()
  if (fullName) return fullName

  const email = conversation?.users?.email?.trim()
  if (email) return email.split('@')[0]

  return 'Unknown User'
}

function getAvatarInitial(name: string) {
  return name.charAt(0).toUpperCase() || 'U'
}

export default function ConversationDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = use(params)
  const { isProtected, user } = useAdminRoute()
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!isProtected) return
    loadConversation()
    markAsRead()
    const interval = setInterval(loadMessages, 3000) // Poll for new messages
    return () => clearInterval(interval)
  }, [isProtected, id])

  async function loadConversation() {
    try {
      const res = await fetch(`/api/conversations/${id}`)
      const { conversation } = await res.json()
      setConversation(conversation)
    } catch (error) {
      console.error('Error loading conversation:', error)
    }
  }

  async function loadMessages() {
    try {
      const res = await fetch(`/api/conversations/${id}/messages`)
      const { messages } = await res.json()
      setMessages(messages || [])
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }

  async function markAsRead() {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: true }),
      })
      if (!res.ok) throw new Error('Failed to mark as read')
    } catch (error) {
      console.error('Error marking conversation as read:', error)
    }
  }

  async function sendReply() {
    if (!reply.trim() || !user) return
    setSending(true)
    try {
      const res = await fetch(`/api/conversations/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: reply,
          senderRole: 'admin',
          senderId: user.id,
          messageType: 'text',
        }),
      })
      if (!res.ok) throw new Error('Failed to send message')
      setReply('')
      await loadMessages()
    } catch (error) {
      console.error('Error sending reply:', error)
    } finally {
      setSending(false)
    }
  }

  async function closeConversation() {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      })
      if (!res.ok) throw new Error('Failed to close')
      setConversation((c) => (c ? { ...c, status: 'closed' } : null))
    } catch (error) {
      console.error('Error closing conversation:', error)
    }
  }

  if (loading) {
    return <AdminLoading />
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white text-xl">Conversation not found</div>
      </div>
    )
  }

  const username = getConversationUsername(conversation)
  const avatarInitial = getAvatarInitial(username)
  const hasCustomSubject = Boolean(conversation.subject && conversation.subject !== 'Support request')

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-emerald-950 to-slate-900 text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 p-4 bg-slate-900/50">
        <div className="container mx-auto max-w-4xl">
          <div className="flex justify-between items-center">
            <div className="flex items-start gap-3">
              <a
                href={`/${locale}/admin/chats`}
                className="mt-2 text-sm text-gray-300 hover:text-white"
              >
                {'<-'} Back
              </a>
              <div className="mt-1 h-10 w-10 shrink-0 rounded-full border border-emerald-400/40 bg-emerald-500/20 text-sm font-bold text-emerald-200 flex items-center justify-center">
                {avatarInitial}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold">{username}</h1>
                {hasCustomSubject && <div className="text-xs text-gray-400">{conversation.subject}</div>}
                <div className="truncate text-sm text-gray-300 mt-1">{conversation.users?.email || ''}</div>
              </div>
            </div>
            <div className="flex gap-2">
              {conversation.status === 'open' && (
                <button
                  onClick={closeConversation}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded font-medium flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="container mx-auto max-w-4xl space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 py-8">No messages yet</div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.sender_role === 'user' ? 'justify-start' : 'justify-end'
                }`}
              >
                <div
                  className={`max-w-[85%] px-4 py-3 rounded-2xl border ${
                    msg.sender_role === 'admin'
                      ? 'bg-blue-600/30 border-blue-400/30 text-blue-50 rounded-br-md'
                      : 'bg-pink-500/10 border-pink-300/20 text-gray-100 rounded-bl-md'
                  }`}
                >
                  <span className="mb-1 block text-xs font-semibold text-gray-400">
                    {msg.sender_role === 'user' ? 'User' : 'Admin'}
                  </span>
                  <p className="break-words">{msg.content}</p>
                  <span className="mt-2 block text-xs font-medium opacity-70">
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Reply Input */}
      {conversation.status === 'open' && (
        <div className="border-t border-white/10 p-4 bg-slate-900/50">
          <div className="container mx-auto max-w-4xl">
            <div className="flex gap-2">
              <input
                type="text"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendReply()}
                placeholder="Type your response..."
                className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={sendReply}
                disabled={sending || !reply.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded font-medium flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
