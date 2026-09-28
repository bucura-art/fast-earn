"use client"

import { use, useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useProtectedRoute } from '@/lib/hooks'
import { getCurrentUser } from '@/lib/auth'
import { calculateTaskReward } from '@/lib/reward'
import { completeTask, getAvailableTasks, getTask, getUserTaskCompletions, startTask, getTodayTaskCount } from '@/lib/tasks'
import PageLoading from '@/components/general/PageLoading'
import { getUserSubscription, getDailyTaskLimit, getTierNameFromSubscription } from '@/lib/subscription'
import { Task } from '@/lib/types'
import { AlertCircle, CheckCircle2, Clock3, X, Lock, Eye, Share2 } from 'lucide-react'
import CopyButton from '@/components/general/CopyButton'
import supabase from '@/lib/supabaseClient'
import TikTokTaskCard from '@/components/tasks/TikTokTaskCard'
import InstagramTaskCard from '@/components/tasks/InstagramTaskCard'
import YouTubeSubscribeTaskCard from '@/components/tasks/YouTubeSubscribeTaskCard'
import { generateReferralLink } from '@/lib/referral'

interface TasksPageProps {
  params: Promise<{ locale: string }>
}

interface PendingTaskState {
  completionId: string
  startedAt: number
  source: 'server' | 'session'
}

interface NotificationState {
  type: 'success' | 'error' | 'info'
  title: string
  message: string
}

const REWARD_DELAY_MS = 2 * 60 * 1000
const AUTO_CREDIT_WINDOW_MS = 10 * 60 * 1000
const PENDING_TASK_STORAGE_KEY_PREFIX = 'fast-earn:pending-task-completions:'

const getPendingTaskStorageKey = (userId: string) => `${PENDING_TASK_STORAGE_KEY_PREFIX}${userId}`

const readTrackedPendingCompletionIds = (userId: string): string[] => {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(getPendingTaskStorageKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === 'string')
  } catch {
    return []
  }
}

const writeTrackedPendingCompletionIds = (userId: string, ids: string[]) => {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(getPendingTaskStorageKey(userId), JSON.stringify(ids))
  } catch {
    // Ignore localStorage write failures
  }
}

const addTrackedPendingCompletionId = (userId: string, completionId: string) => {
  const ids = readTrackedPendingCompletionIds(userId)
  if (ids.includes(completionId)) return
  writeTrackedPendingCompletionIds(userId, [...ids, completionId])
}

const removeTrackedPendingCompletionId = (userId: string, completionId: string) => {
  const ids = readTrackedPendingCompletionIds(userId)
  if (!ids.includes(completionId)) return
  writeTrackedPendingCompletionIds(
    userId,
    ids.filter((id) => id !== completionId)
  )
}

function TaskTimer({ startedAt, durationMs }: { startedAt: number; durationMs: number }) {
  const [timeLeft, setTimeLeft] = useState(0)

  useEffect(() => {
    const update = () => {
      const elapsed = Date.now() - startedAt
      const remaining = Math.max(0, durationMs - elapsed)
      setTimeLeft(remaining)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [startedAt, durationMs])

  if (timeLeft <= 0) return <span>Reward Ready</span>

  const totalSeconds = Math.ceil(timeLeft / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return (
    <span>Reward in {minutes}:{String(seconds).padStart(2, '0')}</span>
  )
}

const getTaskButtonColor = (category: string) => {
  switch (category) {
    case 'subscribe':
      return 'bg-red-600 hover:bg-red-500'
    case 'install':
      return 'bg-green-600 hover:bg-green-500'
    case 'follow':
      return 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90'
    default:
      return 'bg-blue-600 hover:bg-blue-500'
  }
}

export default function TasksPage({ params }: TasksPageProps) {
  const { locale } = use(params)
  const router = useRouter()
  const { isProtected } = useProtectedRoute()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null)
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([])
  const [pendingTasks, setPendingTasks] = useState<Record<string, PendingTaskState>>({})
  const [finalizingTaskIds, setFinalizingTaskIds] = useState<string[]>([])
  const [notification, setNotification] = useState<NotificationState | null>(null)
  const [dailyLimit, setDailyLimit] = useState(5)
  const [todayCount, setTodayCount] = useState(0)
  const [userTier, setUserTier] = useState<string>('free')

  const showNotification = useCallback((type: NotificationState['type'], title: string, message: string) => {
    setNotification({ type, title, message })
  }, [])

  const loadTaskData = useCallback(async (currentUserId: string) => {
    const { data: userProfile } = await supabase.from('users').select('tier_id').eq('id', currentUserId).single()

    const [availableTasks, completions, todayCountVal, subscription, tierData] = await Promise.all([
      getAvailableTasks(currentUserId),
      getUserTaskCompletions(currentUserId, 500),
      getTodayTaskCount(currentUserId),
      getUserSubscription(currentUserId),
      userProfile?.tier_id ? supabase.from('tiers').select('name').eq('id', userProfile.tier_id).maybeSingle() : Promise.resolve({ data: null })
    ])

    const tierName = (tierData.data?.name as any) || getTierNameFromSubscription(subscription)
    setDailyLimit(getDailyTaskLimit(tierName))
    setUserTier(tierName)
    setTodayCount(todayCountVal)

    const actionTasks = availableTasks.filter((task) => {
      if (task.category === 'video') return false
      // If user is Pro Max, do not show upsell tasks (they already have max access)
      if (tierName === 'pro_max' && (task as any).is_upsell) return false
      return true
    })
    setTasks(actionTasks)

    const approvedSet = new Set(
      completions
        .filter((completion) => completion.status === 'approved')
        .map((completion) => completion.task_id)
    )

    const trackedPendingIds = new Set(readTrackedPendingCompletionIds(currentUserId))
    const pendingCompletionIds = new Set(
      completions.filter((completion) => completion.status === 'pending').map((completion) => completion.id)
    )
    const cleanedTrackedPendingIds = Array.from(trackedPendingIds).filter((id) => pendingCompletionIds.has(id))
    writeTrackedPendingCompletionIds(currentUserId, cleanedTrackedPendingIds)
    const trackedPendingSet = new Set(cleanedTrackedPendingIds)

    const pendingMap: Record<string, PendingTaskState> = {}
    for (const completion of completions) {
      if (completion.status !== 'pending') continue
      if (approvedSet.has(completion.task_id)) continue

      const startedAt = new Date(completion.created_at).getTime() || Date.now()
      const existing = pendingMap[completion.task_id]
      if (!existing || startedAt > existing.startedAt) {
        pendingMap[completion.task_id] = {
          completionId: completion.id,
          startedAt,
          source: trackedPendingSet.has(completion.id) ? 'session' : 'server',
        }
      }
    }

    setCompletedTaskIds(Array.from(approvedSet))
    setPendingTasks(pendingMap)
  }, [])

  useEffect(() => {
    if (!isProtected) return

    const load = async () => {
      try {
        const user = await getCurrentUser()
        if (!user) return
        setUserId(user.id)
        await loadTaskData(user.id)
      } catch (error) {
        console.error('Error loading tasks:', error)
        showNotification('error', 'Failed to load tasks', 'Please refresh and try again.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [isProtected, loadTaskData, showNotification])

  useEffect(() => {
    if (!notification) return
    const timeout = setTimeout(() => setNotification(null), 4500)
    return () => clearTimeout(timeout)
  }, [notification])

  // Use a ref for pendingTasks to access the latest value inside the interval without re-triggering it
  const pendingTasksRef = useRef(pendingTasks)
  useEffect(() => {
    pendingTasksRef.current = pendingTasks
  }, [pendingTasks])

  useEffect(() => {
    const interval = setInterval(() => {
      const currentPending = pendingTasksRef.current
      const now = Date.now()
      
      Object.entries(currentPending).forEach(([taskId, pending]) => {
        if (completedTaskIds.includes(taskId)) return
        if (finalizingTaskIds.includes(taskId)) return

        const elapsed = now - pending.startedAt
        if (pending.source === 'server' && elapsed > AUTO_CREDIT_WINDOW_MS) return

        if (elapsed >= REWARD_DELAY_MS) {
          finalizePendingTask(taskId, pending.completionId)
        }
      })
    }, 2000) // Check every 2 seconds instead of 1 to reduce load
    return () => clearInterval(interval)
  }, [completedTaskIds, finalizingTaskIds]) // Removed finalizePendingTask from deps to avoid re-binding

  const finalizePendingTask = useCallback(
    async (taskId: string, completionId: string) => {
      if (!userId) return
      if (finalizingTaskIds.includes(taskId)) return

      setFinalizingTaskIds((prev) => (prev.includes(taskId) ? prev : [...prev, taskId]))

      try {
        let task = tasks.find((item) => item.id === taskId) || null
        if (!task) {
          task = await getTask(taskId)
        }

        if (!task) {
          throw new Error('Task not found')
        }

        const reward = await calculateTaskReward(userId, task.base_reward)
        const success = await completeTask(completionId, userId, taskId, reward)

        if (!success) {
          throw new Error('Completion failed')
        }

        setPendingTasks((prev) => {
          const next = { ...prev }
          delete next[taskId]
          return next
        })
        removeTrackedPendingCompletionId(userId, completionId)
        setCompletedTaskIds((prev) => (prev.includes(taskId) ? prev : [...prev, taskId]))
        showNotification('success', 'Task completed', `You earned ${reward} RWF.`)
        await loadTaskData(userId)
      } catch (error) {
        console.error('Error finalizing delayed task reward:', error)
        setPendingTasks((prev) => {
          const next = { ...prev }
          delete next[taskId]
          return next
        })
        removeTrackedPendingCompletionId(userId, completionId)
        showNotification('error', 'Task processing failed', 'Please try the task again.')
        await loadTaskData(userId)
      } finally {
        setFinalizingTaskIds((prev) => prev.filter((id) => id !== taskId))
      }
    },
    [finalizingTaskIds, loadTaskData, showNotification, tasks, userId]
  )

  const getButtonLabel = (category: string): string => {
    switch (category) {
      case 'follow':
        return 'Follow Now'
      case 'subscribe':
        return 'Subscribe'
      case 'install':
        return 'Install App'
      default:
        return 'Visit Link'
    }
  }

  const renderActionButton = (task: Task) => {
    const isCompleted = completedTaskIds.includes(task.id)
    const pending = pendingTasks[task.id]
    const isPending = Boolean(pending)
    const isFinalizing = finalizingTaskIds.includes(task.id)
    const isStarting = completingTaskId === task.id
    const isDisabled = isCompleted || isFinalizing || isStarting || !task.external_url || pending?.source === 'session'

    // Restricted Task Logic
    if ((task as any).is_upsell) {
      return (
        <button
          onClick={() => router.push(`/${locale}/pricing`)}
          className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Lock size={14} /> Upgrade to Unlock
        </button>
      )
    }

    let label: React.ReactNode = getButtonLabel(task.category)
    
    if (isCompleted) label = 'Completed'
    else if (isFinalizing) label = 'Crediting...'
    else if (isStarting) label = 'Starting...'
    else if (pending) {
      if (pending.source === 'session') {
        label = <TaskTimer startedAt={pending.startedAt} durationMs={REWARD_DELAY_MS} />
      } else {
        const elapsed = Date.now() - pending.startedAt
        label = elapsed > AUTO_CREDIT_WINDOW_MS ? 'Continue review' : <TaskTimer startedAt={pending.startedAt} durationMs={REWARD_DELAY_MS} />
      }
    }

    return (
      <button
        onClick={() => handleActionClick(task)}
        disabled={isDisabled}
        className={`w-full py-2.5 px-3 text-white text-sm font-semibold rounded-lg transition-colors ${
          isCompleted
            ? 'bg-emerald-700/80 cursor-not-allowed'
            : isPending || isFinalizing
              ? 'bg-slate-700 cursor-not-allowed'
              : `${getTaskButtonColor(task.category)} disabled:bg-gray-600 disabled:bg-none`
        }`}
      >
        {label}
      </button>
    )
  }

  const handleActionClick = async (task: Task) => {
    if (!userId || !task.external_url) return
    if (completedTaskIds.includes(task.id)) return
    if (pendingTasks[task.id]?.source === 'session') return
    if (pendingTasks[task.id]?.source === 'server') {
      if (todayCount >= dailyLimit) {
        showNotification('info', 'Daily Limit Reached', `You have reached your daily limit of ${dailyLimit} tasks. Upgrade to do more.`)
        return
      }

      const pending = pendingTasks[task.id]
      addTrackedPendingCompletionId(userId, pending.completionId)
      setPendingTasks((prev) => ({
        ...prev,
        [task.id]: {
          ...pending,
          source: 'session',
        },
      }))
      showNotification('info', 'Verification resumed', 'This task is now being processed for reward.')
      return
    }

    try {
      setCompletingTaskId(task.id)

      if (todayCount >= dailyLimit) {
        showNotification('info', 'Daily Limit Reached', `You have reached your daily limit of ${dailyLimit} tasks. Upgrade to do more.`)
        return
      }

      const completion = await startTask(userId, task.id, 'Unknown', 'Unknown')
      if (!completion) {
        showNotification('info', 'Task already completed', 'You can only complete each task once.')
        await loadTaskData(userId)
        return
      }

      if (completion.status === 'approved') {
        showNotification('info', 'Task already completed', 'You can only complete each task once.')
        await loadTaskData(userId)
        return
      }

      const startedAt = new Date(completion.created_at).getTime() || Date.now()
      addTrackedPendingCompletionId(userId, completion.id)
      setPendingTasks((prev) => ({
        ...prev,
        [task.id]: {
          completionId: completion.id,
          startedAt,
          source: 'session',
        },
      }))

      window.open(task.external_url, '_blank', 'noopener,noreferrer')
      showNotification(
        'info',
        'Action started',
        'Reward verification started. You will receive your reward in a few minutes.'
      )
    } catch (error) {
      console.error('Error starting task:', error)
      showNotification('error', 'Unable to start task', 'Please try again in a moment.')
    } finally {
      setCompletingTaskId(null)
    }
  }

  const hasPendingTasks = useMemo(() => Object.keys(pendingTasks).length > 0, [pendingTasks])

  if (loading) {
    return <PageLoading />
  }

  const referralLink = userId ? generateReferralLink(userId) : ''

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white py-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <a href={`/${locale}/dashboard`} className="text-sm text-gray-300 hover:text-white">
            {'<-'} Back
          </a>
        </div>

        <h1 className="text-4xl font-bold mb-2">Available Tasks</h1>
        <p className="text-gray-300 mb-6">Complete simple tasks to earn rewards</p>

        {notification && (
          <div className="fixed top-4 right-4 z-[60] max-w-sm w-[calc(100%-2rem)] md:w-full">
            <div
              className={`border shadow-2xl backdrop-blur-md p-4 bg-slate-900/95 ${
                notification.type === 'success'
                  ? 'border-emerald-400/40'
                  : notification.type === 'error'
                    ? 'border-red-400/40'
                    : 'border-blue-400/40'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  {notification.type === 'success' ? (
                    <CheckCircle2 size={18} className="text-emerald-300 mt-0.5" />
                  ) : notification.type === 'error' ? (
                    <AlertCircle size={18} className="text-red-300 mt-0.5" />
                  ) : (
                    <Clock3 size={18} className="text-blue-300 mt-0.5" />
                  )}
                  <div>
                    <p className="font-bold text-white">{notification.title}</p>
                    <p className="text-sm text-slate-200 mt-0.5">{notification.message}</p>
                  </div>
                </div>
                <button
                  onClick={() => setNotification(null)}
                  className="text-slate-400 hover:text-white transition-colors"
                  aria-label="Close notification"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {hasPendingTasks && (
          <div className="mb-6 p-4 bg-blue-600/10 border border-blue-400/30">
            <p className="text-blue-200 text-sm">
              Some tasks require verification. Rewards will be credited automatically after we confirm the action was completed.
            </p>
          </div>
        )}

        <div className="mb-6 p-4 bg-blue-600/10 border border-blue-400/30 rounded-lg flex justify-between items-center">
          <div>
            <p className="text-white text-xl font-bold">Daily task</p>
            <p className="text-blue-300 text-xs">Tasks limit is based on your account category</p>
            {dailyLimit < 20 && (
              <button
                onClick={() => router.push(`/${locale}/pricing`)}
                className="mt-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded transition-colors"
              >
                Upgrade Account
              </button>
            )}
          </div>
          <div className="text-right">
            <span className={`text-2xl font-bold ${todayCount >= dailyLimit ? 'text-red-400' : 'text-white'}`}>{todayCount}</span>
            <span className="text-blue-300">/{dailyLimit}</span>
          </div>
        </div>

        {tasks.length > 0 || userId ? (
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
            {userId && (
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors flex flex-col">
                <div className="mb-4 flex justify-between items-start">
                  <span className="inline-block px-3 py-1 bg-blue-600/30 text-blue-300 rounded-full text-xs font-medium">
                    Referral
                  </span>
                  <button
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && navigator.share) {
                        navigator.share({
                          title: 'Join Fast Earn',
                          text: 'Earn money by completing simple tasks!',
                          url: referralLink,
                        }).catch(() => {})
                      } else {
                        showNotification('info', 'Share', 'Please use the copy button below.')
                      }
                    }}
                    className="text-blue-300 hover:text-white transition-colors"
                    title="Share Referral Link"
                  >
                    <Share2 size={20} />
                  </button>
                </div>

                <h3 className="text-xl font-bold mb-2 flex-grow">Referral Program</h3>
                <p className="text-gray-200 text-lg mb-4">Share Fast-Earn link with friends and earn 5-20% bonuses on the tasks they complete.</p>

                <div className="space-y-2 mb-6 pb-6 border-b border-white/10">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Reward:</span>
                    <span className="text-emerald-400 font-bold">5-20% Bonus</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <CopyButton
                    textToCopy={referralLink}
                    className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
                    onCopy={(success) => {
                      if (success) {
                        showNotification('success', 'Copied', 'Referral link copied to clipboard.')
                      } else {
                        showNotification('error', 'Copy failed', 'Could not copy your referral link.')
                      }
                    }}
                    successContent="Copied!"
                  >
                    Copy link
                  </CopyButton>
                </div>
              </div>
            )}

            {tasks.map((task) => {
              const reward = task.base_reward * (userTier === 'pro' ? 2 : userTier === 'pro_max' ? 3 : 1)
              
              if (task.category === 'follow' && task.external_url?.includes('tiktok.com')) {
                return <TikTokTaskCard key={task.id} task={task} reward={reward} actionButton={renderActionButton(task)} />
              }

              if (task.category === 'follow' && task.external_url?.includes('instagram.com')) {
                return <InstagramTaskCard key={task.id} task={task} reward={reward} actionButton={renderActionButton(task)} />
              }

              if (task.category === 'subscribe' && (task.external_url?.includes('youtube.com') || task.external_url?.includes('youtu.be'))) {
                return <YouTubeSubscribeTaskCard key={task.id} task={task} reward={reward} actionButton={renderActionButton(task)} />
              }

              return (
                <div key={task.id} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors flex flex-col overflow-hidden">
                  <div className="mb-4">
                    <span className="inline-block px-3 py-1 bg-purple-600/30 text-purple-300 rounded-full text-xs font-medium capitalize">
                      {task.category}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold mb-2 break-words">{task.title}</h3>
                  <p className="text-gray-400 text-sm mb-4 flex-grow break-words">{task.description}</p>

                  <div className="space-y-2 mb-6 pb-6 border-b border-white/10">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Reward:</span>
                      <span className="text-emerald-400 font-bold">{reward.toLocaleString()} RWF</span>
                    </div>
                  </div>

                  {renderActionButton(task)}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No available tasks at the moment</p>
            <p className="text-gray-500 text-sm mb-6">Check back later for new opportunities</p>
            <a
              href={`/${locale}/dashboard/videos`}
              className="inline-block py-2 px-6 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg"
            >
              Watch Videos Instead
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
