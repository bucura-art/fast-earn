'use client'

import { useState, useEffect } from 'react'
import { Task } from '@/lib/types'
import { useTaskTimer } from '@/lib/useTaskTimer'
import { Play } from 'lucide-react'

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

const getInstagramId = (url: string): string | null => {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace('www.', '')

    if (host === 'instagram.com') {
      if (parsed.pathname.startsWith('/reel/')) {
        return parsed.pathname.split('/reel/')[1].split('/')[0] || null
      }
      if (parsed.pathname.startsWith('/p/')) {
        return parsed.pathname.split('/p/')[1].split('/')[0] || null
      }
    }
  } catch {
    return null
  }
  return null
}

const getTikTokId = (url: string): string | null => {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace('www.', '')

    if (host === 'tiktok.com') {
      if (parsed.pathname.includes('/video/')) {
        return parsed.pathname.split('/video/')[1].split('/')[0] || null
      }
    }
  } catch {
    return null
  }
  return null
}

const isVerticalVideo = (url: string): boolean => {
  if (!url) return false
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace('www.', '')

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      return parsed.pathname.startsWith('/shorts/')
    }
    if (host === 'instagram.com') {
      return parsed.pathname.startsWith('/reel/') || parsed.pathname.startsWith('/p/')
    }
    if (host === 'tiktok.com') {
      return true
    }
  } catch {
    return false
  }
  return false
}

const getEmbedUrl = (url: string | null | undefined) => {
  if (!url) return ''
  const youtubeId = getYouTubeId(url)
  if (youtubeId) {
    return `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`
  }
  const instagramId = getInstagramId(url)
  if (instagramId) {
    return `https://www.instagram.com/reel/${instagramId}/embed`
  }
  const tiktokId = getTikTokId(url)
  if (tiktokId) {
    return `https://www.tiktok.com/embed/v2/${tiktokId}`
  }
  return url
}

const getVideoThumbnail = (url: string) => {
  if (!url) return '/images/CTA/video.jpg'
  const youtubeId = getYouTubeId(url)
  if (youtubeId) return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
  const instagramId = getInstagramId(url)
  if (instagramId) return `https://www.instagram.com/p/${instagramId}/media/?size=m`
  // TikTok thumbnails require API, fallback to default
  return '/images/CTA/video.jpg'
}

export default function TaskVideoPlayer({
  video,
  completionId,
  onComplete,
  onCancel,
}: {
  video: Task
  completionId: string
  onComplete: (videoId: string, completionId: string) => Promise<void>
  onCancel: () => void
}) {
  const { watchedSeconds, isPlaying, handlePlaying, handleStalled } = useTaskTimer()
  const [hasStarted, setHasStarted] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [hasAutoCompleted, setHasAutoCompleted] = useState(false)

  const videoUrl = video.external_url || video.video_url || ''
  const isVertical = isVerticalVideo(videoUrl)

  const handleStart = () => {
    setHasStarted(true)
    handlePlaying()
  }

  const handleComplete = async () => {
    setIsCompleting(true)
    await onComplete(video.id, completionId)
    setIsCompleting(false)
  }

  useEffect(() => {
    if (watchedSeconds >= (video.min_watch_seconds || 30) && !isCompleting && !hasAutoCompleted) {
      setHasAutoCompleted(true)
      handleComplete()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedSeconds, video.min_watch_seconds, hasAutoCompleted, isCompleting])

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className={`bg-black/90 rounded-2xl w-full p-6 border border-white/10 flex flex-col ${isVertical ? 'max-w-sm max-h-[90vh]' : 'max-w-2xl'}`}>
        <h2 className="text-2xl font-bold mb-4 shrink-0">{video.title}</h2>

        {hasStarted && videoUrl ? (
          <div className={`mb-6 bg-gray-900 rounded-lg overflow-hidden ${isVertical ? 'aspect-[9/16]' : 'aspect-video'}`}>
            <iframe
              src={getEmbedUrl(videoUrl)}
              title={video.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : videoUrl ? (
          <div className={`mb-6 bg-gray-900 rounded-lg overflow-hidden relative group cursor-pointer ${isVertical ? 'aspect-[9/16]' : 'aspect-video'}`} onClick={handleStart}>
            <img 
              src={getVideoThumbnail(videoUrl)} 
              alt={video.title} 
              className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" 
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Play size={32} className="text-white ml-1" />
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-6 aspect-video bg-gray-800 rounded-lg flex items-center justify-center">
            <p className="text-gray-400">Video not available</p>
          </div>
        )}

        <div className="mt-auto shrink-0">
          <div className="mb-6">
            <p className="text-gray-300 mb-2">
              Watched: <span className="text-blue-400 font-bold">{Math.round(watchedSeconds)}s</span> /{' '}
              {video.min_watch_seconds || 30}s
            </p>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (watchedSeconds / (video.min_watch_seconds || 30)) * 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleComplete}
              disabled={watchedSeconds < (video.min_watch_seconds || 30) || isCompleting}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white font-bold rounded-lg transition-colors"
            >
              {isCompleting ? 'Completing...' : 'Complete Video'}
            </button>
            <button onClick={onCancel} className="w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}