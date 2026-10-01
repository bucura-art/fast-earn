'use client'

import React, { use, useEffect, useMemo, useState } from 'react'
import SupportChatWidget from '@/components/chat/SupportChatWidget'
import UserConversationThread from '@/components/chat/UserConversationThread'
import { useProtectedRoute } from '@/lib/hooks'
import { MessageSquarePlus, Trash2, ArrowLeft } from 'lucide-react'

interface Conversation {
  id: string
  subject: string
  status: 'open' | 'closed'
  metadata?: { type?: string } | null
  created_at: string
  updated_at?: string
  has_unread_admin_reply?: boolean
}

const getConversationTypeLabel = (metadata?: { type?: string } | null): string => {
  const type = metadata?.type || 'support'
  if (type === 'upgrade') return 'Upgrade'
  if (type === 'withdraw') return 'Withdrawal'
  return 'Support'
}

export default function SupportPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  const { user, isProtected } = useProtectedRoute()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [newRequestKey, setNewRequestKey] = useState(0)
  const [isCreatingNewChat, setIsCreatingNewChat] = useState(false)
  const [hasMessageSent, setHasMessageSent] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  )

  useEffect(() => {
    if (!isProtected || !user) return
    void loadConversations(user.id)
    const interval = setInterval(() => void loadConversations(user.id), 5000)
    return () => clearInterval(interval)
  }, [isProtected, user?.id])

  async function loadConversations(userId: string) {
    try {
      const res = await fetch(`/api/conversations?userId=${userId}&type=support`)
      if (!res.ok) throw new Error('Failed to fetch conversations')
      const payload = await res.json()
      const list = (payload?.conversations || []) as Conversation[]
      setConversations(list)
    } catch (error) {
      console.error('Error loading user conversations:', error)
    } finally {
      setLoadingConversations(false)
    }
  }

  const startNewRequest = () => {
    setSelectedConversationId(null)
    setIsCreatingNewChat(true)
    setNewRequestKey((prev) => prev + 1)
    setHasMessageSent(false)
  }

  const handleDeleteConversation = (conversationId: string) => {
    setDeleteModalOpen(conversationId)
  }

  const confirmDelete = async () => {
    if (!user || !deleteModalOpen) return

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/conversations/${deleteModalOpen}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: user.id }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || 'Failed to delete conversation')
      }

      setConversations((prev) => {
        const next = prev.filter((conversation) => conversation.id !== deleteModalOpen)
        if (selectedConversationId === deleteModalOpen) {
          setSelectedConversationId(null)
        }
        return next
      })

      setDeleteModalOpen(null)
    } catch (error) {
      console.error('Error deleting conversation:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const formatShortTimestamp = (value?: string) => {
    if (!value) return ''
    return new Date(value).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const showChatOnMobile = !!selectedConversationId || isCreatingNewChat

  return (
    <div className="min-h-screen bg-slate-900 text-white py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <a href={`/${locale}/dashboard`} className="text-sm text-gray-300 hover:text-white">
            {'<-'} Back
          </a>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          <div className={`lg:col-span-4 space-y-6 ${showChatOnMobile ? 'hidden lg:block' : 'block'}`}>
            <div>
              <h1 className="text-3xl font-bold mb-2">Support Chat</h1>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <button
                onClick={startNewRequest}
                className="w-full mb-4 py-2.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-semibold flex items-center justify-center gap-2"
              >
                <MessageSquarePlus size={16} />
                Start New Request
              </button>

              <h2 className="text-sm uppercase tracking-wide text-gray-400 mb-3">Your Conversations</h2>

              {loadingConversations ? (
                <p className="text-sm text-gray-400">Loading...</p>
              ) : conversations.length === 0 ? (
                <p className="text-sm text-gray-400">No conversations yet.</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {conversations.map((conversation) => {
                    const isActive = selectedConversationId === conversation.id
                    const hasUnread = conversation.has_unread_admin_reply && !isActive
                    return (
                      <div
                        key={conversation.id}
                        className={`w-full p-2 rounded-lg border transition-colors ${
                          isActive
                            ? 'bg-blue-600/20 border-blue-400/40'
                            : 'bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <button
                            onClick={() => {
                              setSelectedConversationId(conversation.id)
                              setIsCreatingNewChat(false)
                              if (hasUnread) {
                                // Optimistically mark as read on the client
                                setConversations((prev) =>
                                  prev.map((c) => (c.id === conversation.id ? { ...c, has_unread_admin_reply: false } : c))
                                )
                                // NOTE: An API call should ideally be made here to mark as read on the backend.
                              }
                            }}
                            className="flex-1 text-left p-1"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold truncate flex items-center gap-2">
                                {hasUnread && (
                                  <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" title="New reply from admin"></div>
                                )}
                                {conversation.subject || `${getConversationTypeLabel(conversation.metadata)} Request`}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded ${
                                  conversation.status === 'open'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-gray-500/20 text-gray-300'
                                }`}
                              >
                                {conversation.status}
                              </span>
                            </div>
                            <span className="mt-1 block text-xs font-medium text-gray-400">
                              {getConversationTypeLabel(conversation.metadata)} -{' '}
                              {formatShortTimestamp(conversation.updated_at || conversation.created_at)}
                            </span>
                          </button>
                          <button
                            onClick={() => void handleDeleteConversation(conversation.id)}
                            className="p-2 rounded text-red-300 hover:text-red-200 hover:bg-red-500/10 transition-colors"
                            aria-label="Delete conversation"
                            title="Delete conversation"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className={`lg:col-span-8 ${!showChatOnMobile ? 'hidden lg:block' : 'block'}`}>
            {selectedConversation ? (
              <UserConversationThread
                conversationId={selectedConversation.id}
                status={selectedConversation.status}
                className="h-[600px]"
                onBack={() => setSelectedConversationId(null)}
              />
            ) : isCreatingNewChat ? (
              <div className="space-y-3">
                <SupportChatWidget
                  key={newRequestKey}
                  locale={locale}
                  onConversationCreated={(id) => {
                    if (user?.id) {
                      void loadConversations(user.id)
                    }
                  }}
                  onFirstMessageSent={() => setHasMessageSent(true)}
                  onCancel={() => setIsCreatingNewChat(false)}
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
                <p className="text-gray-300 mb-2">No conversation selected.</p>
                <p className="text-sm text-gray-400 mb-5">Select one from the list or start a new support chat.</p>
                <button
                  onClick={startNewRequest}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-semibold"
                >
                  <MessageSquarePlus size={15} />
                  Start New Chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-white mb-2">Delete Conversation</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this conversation? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModalOpen(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void confirmDelete()}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
