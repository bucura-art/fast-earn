"use client"

import { use } from 'react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useProtectedRoute } from '@/lib/hooks'
import { getCurrentUser } from '@/lib/auth'
import { getAvailableTasks, startTask, completeTask, getUserTaskCompletions, getTodayTaskCount } from '@/lib/tasks'
import { getUserSubscription, getDailyTaskLimit, getTierNameFromSubscription } from '@/lib/subscription'
import { calculateTaskReward } from '@/lib/reward'
import { Task, TaskCompletion } from '@/lib/types'
import { Play, CheckCircle2, AlertCircle, X, Lock } from 'lucide-react'
import supabase from '@/lib/supabaseClient'
import { TIER_MULTIPLIERS } from '@/lib/tierUtils'
import PageLoading from '@/components/general/PageLoading'
import SiteHeader from '@/components/general/SiteHeader'
import SiteNav from '@/components/general/SiteNav'
import TaskVideoPlayer from '@/components/tasks/TaskVideoPlayer'

interface VideosPageProps {
  params: Promise<{ locale: string }>
}

interface NotificationState {
  type: 'success' | 'error' | 'info'
  title: string
  message: string
}

const getYouTubeId = (url: string): string | null => {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace('www.', '')

    if (host === 'youtu.be') {
      return parsed.pathname.split('/').filter(Boolean)[0] || null
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname === '/watch') {
        return parsed.searchParams.get('v')
      }
      if (parsed.pathname.startsWith('/embed/')) {
        return parsed.pathname.split('/embed/')[1] || null
      }
      if (parsed.pathname.startsWith('/shorts/')) {
        return parsed.pathname.split('/shorts/')[1] || null
      }
    }
  } catch {
    return null
  }

  return null
}

export default function VideosPage({ params }: VideosPageProps) {
  const { locale } = use(params)
  const router = useRouter()
  const { isProtected } = useProtectedRoute()
  const [videos, setVideos] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVideo, setSelectedVideo] = useState<Task | null>(null)
  const [activeCompletion, setActiveCompletion] = useState<TaskCompletion | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [completedVideoIds, setCompletedVideoIds] = useState<string[]>([])
  const [notification, setNotification] = useState<NotificationState | null>(null)
  const [dailyLimit, setDailyLimit] = useState(5)
  const [todayCount, setTodayCount] = useState(0)
  const [userTier, setUserTier] = useState<string>('free')

  const getVideoThumbnail = (video: Task): string => {
    const sourceUrl = video.external_url || video.video_url || ''
    if (!sourceUrl) return '/images/CTA/video.jpg'

    const youtubeId = getYouTubeId(sourceUrl)
    if (youtubeId) {
      return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
    }

    return '/images/CTA/video.jpg'
  }

  const showNotification = (type: NotificationState['type'], title: string, message: string) => {
    setNotification({ type, title, message })
  }

  const loadVideoData = async (id: string) => {
    const { data: userProfile } = await supabase.from('users').select('tier_id').eq('id', id).single()

    const [allTasks, completions, todayCountVal, subscription, tierData] = await Promise.all([
      getAvailableTasks(id, 'video'),
      getUserTaskCompletions(id, 500),
      getTodayTaskCount(id),
      getUserSubscription(id),
      userProfile?.tier_id ? supabase.from('tiers').select('name').eq('id', userProfile.tier_id).maybeSingle() : Promise.resolve({ data: null })
    ])

    const tierName = (tierData.data?.name as any) || getTierNameFromSubscription(subscription)
    setDailyLimit(getDailyTaskLimit(tierName))
    setUserTier(tierName)
    setTodayCount(todayCountVal)

    const approvedTaskIds = Array.from(
      new Set<string>(
        completions
          .filter((completion) => completion.status === 'approved')
          .map((completion) => String(completion.task_id))
      )
    )

    const filteredVideos = allTasks.filter((video) => {
      // If user is Pro Max, do not show upsell tasks
      if (tierName === 'pro_max' && (video as any).is_upsell) return false
      return true
    })
    setVideos(filteredVideos)
    setCompletedVideoIds(approvedTaskIds)
  }

  useEffect(() => {
    if (!isProtected) return

    const loadVideos = async () => {
      try {
        const user = await getCurrentUser()
        if (user) {
          setUserId(user.id)
          await loadVideoData(user.id)
        }
      } catch (error) {
        console.error('Error loading videos:', error)
        showNotification('error', 'Failed to load videos', 'Please refresh and try again.')
      } finally {
        setLoading(false)
      }
    }

    loadVideos()
  }, [isProtected])

  useEffect(() => {
    if (!notification) return

    const timeout = setTimeout(() => setNotification(null), 4500)
    return () => clearTimeout(timeout)
  }, [notification])

  const handleStartVideo = async (video: Task) => {
    if (!userId) return
    if (completedVideoIds.includes(video.id)) return

    if ((video as any).is_upsell) {
      router.push(`/${locale}/pricing`)
      return
    }

    if (todayCount >= dailyLimit) {
      showNotification('info', 'Daily Limit Reached', `You have reached your daily limit of ${dailyLimit} tasks. Upgrade to do more.`)
      return
    }

    try {
      const completion = await startTask(userId, video.id, 'Unknown', 'Unknown')
      if (completion) {
        setActiveCompletion(completion)
        setSelectedVideo(video)
      } else {
        showNotification('info', 'Video already completed', 'You can only complete each video once.')
      }
    } catch (error) {
      console.error('Error starting video:', error)
      showNotification('error', 'Unable to start video', 'Please try again in a moment.')
    }
  }

  const handleCompleteVideo = async (videoId: string, completionId: string) => {
    if (!userId) return
    const video = videos.find((v) => v.id === videoId)
    if (!video) return

    try {
      const reward = await calculateTaskReward(userId, video.base_reward)
      const success = await completeTask(completionId, userId, videoId, reward)

      if (success) {
        showNotification('success', 'Video completed', `You earned ${reward} RWF.`)
        setCompletedVideoIds((prev) => (prev.includes(videoId) ? prev : [...prev, videoId]))
        setSelectedVideo(null)
        setActiveCompletion(null)
        await loadVideoData(userId)
      } else {
        showNotification('error', 'Completion failed', 'We could not complete this video. Try again.')
      }
    } catch (error) {
      console.error('Error completing video:', error)
      showNotification('error', 'Completion failed', 'We could not complete this video. Try again.')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-linear-to-b from-slate-900 via-indigo-950 to-slate-900 text-white">
        <SiteHeader locale={locale} />
        <PageLoading className="min-h-0 flex-1" />
        <SiteNav locale={locale} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-900 via-indigo-950 to-slate-900 pb-24 text-white md:pb-8">
      <SiteHeader locale={locale} />
      <div className="container mx-auto px-4 pt-8">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-300">
          <ol className="flex items-center gap-2">
            <li><Link href={`/${locale}/workspace`} className="text-2xl text-white">Workspace</Link></li>
            <li aria-hidden="true">&gt;</li>
            <li aria-current="page" className="font-semibold text-white">Videos</li>
          </ol>
        </nav>


        {notification && (
          <div className="fixed top-4 right-4 z-60 max-w-sm w-[calc(100%-2rem)] md:w-full">
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
                    <AlertCircle size={18} className="text-blue-300 mt-0.5" />
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

        <div className="mb-6 p-4 bg-blue-600/10 border border-blue-400/30 rounded-lg flex justify-between items-center">
          <div>
            <p className="text-white text-xl font-bold">Daily Limit</p>
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
            <span className="text-white/500">/{dailyLimit}</span>
          </div>
        </div>

        {/* Video Player Modal */}
        {selectedVideo && activeCompletion && (
          <TaskVideoPlayer
            video={selectedVideo}
            completionId={activeCompletion.id}
            onComplete={handleCompleteVideo}
            onCancel={() => {
              setSelectedVideo(null)
              setActiveCompletion(null)
            }}
          />
        )}

        {/* Video Grid */}
        {videos.length > 0 ? (
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
            {videos.map((video) => {
              const multiplier = TIER_MULTIPLIERS[userTier as keyof typeof TIER_MULTIPLIERS] || 1.0
              const displayReward = Math.round(video.base_reward * multiplier * 100) / 100
              return (
              <div key={video.id} className="rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/50 transition-colors flex flex-col overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleStartVideo(video)}
                  disabled={completedVideoIds.includes(video.id) || (Boolean(activeCompletion) && !(video as any).is_upsell)}
                  className={`w-full h-40 bg-gray-900 relative text-left ${
                    completedVideoIds.includes(video.id)
                      ? 'opacity-65 cursor-not-allowed'
                      : activeCompletion
                        ? 'opacity-75 cursor-not-allowed'
                        : 'hover:opacity-90'
                  }`}
                >
                  <img
                    src={getVideoThumbnail(video)}
                    alt={`${video.title} thumbnail`}
                    className="w-full h-full object-cover opacity-85"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                    {completedVideoIds.includes(video.id) ? (
                      <span className="px-3 py-1 text-xs font-semibold bg-emerald-600/85 text-white border border-emerald-300/40">
                        Completed
                      </span>
                    ) : (video as any).is_upsell ? (
                      <span className="w-12 h-12 rounded-full bg-amber-600/80 border border-amber-400/50 flex items-center justify-center backdrop-blur-sm">
                        <Lock size={20} className="text-white" />
                      </span>
                    ) : (
                      <span className="w-10 h-10 rounded-full bg-stone-900/80 border border-gray-400/50 flex items-center justify-center">
                        <Play size={18} className="text-white ml-0.5" />
                      </span>
                    )}
                  </div>
                </button>

                <div className="p-6 flex flex-col grow">
                  <h3 className="text-xl font-bold mb-2 grow">{video.title}</h3>
                  <p className="text-gray-400 text-sm mb-4">{video.description}</p>

                  {(video as any).is_upsell && (
                    <div className="mb-4 p-2 bg-amber-900/20 border border-amber-500/30 rounded text-xs text-amber-200 flex items-center gap-2">
                      <AlertCircle size={14} />
                      You cannot complete this task on {userTier} account
                    </div>
                  )}

                  <div className="space-y-2 mb-6 pb-6 border-b border-white/10">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Reward:</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-2">
                        {displayReward} RWF
                        {userTier === 'pro' && <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30">2x Applied</span>}
                        {userTier === 'pro_max' && <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30">3x Applied</span>}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Watch Time:</span>
                      <span className="text-gray-300">{video.min_watch_seconds || 30}s</span>
                    </div>
                  </div>

                  {userTier !== 'pro_max' && (
                    <div className="space-y-2 mt-auto">
                      <button
                        onClick={() => router.push(`/${locale}/pricing`)}
                        className="w-full py-3 px-4 bg-linear-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-bold rounded-lg transition-colors text-sm"
                      >
                        {(video as any).is_upsell ? 'Upgrade to Unlock' : 'Earn 3x'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )})}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No videos available at the moment</p>
            <p className="text-gray-500 text-sm mb-6">Check back later for new sponsored videos</p>
            <a
              href={`/${locale}/workspace/tasks`}
              className="inline-block py-2 px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg"
            >
              Complete Tasks Instead
            </a>
          </div>
        )}
      </div>
      <SiteNav locale={locale} />
    </div>
  )
}
