'use client'

import Image from 'next/image'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import SiteHeader from '@/components/general/SiteHeader'
import { useProtectedRoute } from '@/lib/hooks'
import { getCurrentUser } from '@/lib/auth'
import { getUserSubscription, getTierNameFromSubscription } from '@/lib/subscription'
import { UserTier } from '@/lib/types'
import supabase from '@/lib/supabaseClient'
import { getCheckInStatus, submitCheckIn } from '@/lib/checkIn'
import { AlertCircle, CheckCircle2, Clock3, X } from 'lucide-react'

interface WorkspacePageProps {
	params: Promise<{ locale: string }>
}

export default function WorkspacePage({ params }: WorkspacePageProps) {
	const { locale } = use(params)
	const router = useRouter()
	const { isProtected, loading: authLoading } = useProtectedRoute()
	const [tier, setTier] = useState<UserTier | null>(null)
	const [tierError, setTierError] = useState(false)
	const [tierLoading, setTierLoading] = useState(true)
	const [userId, setUserId] = useState<string | null>(null)
	const [checkedInToday, setCheckedInToday] = useState(false)
	const [checkingIn, setCheckingIn] = useState(false)
	const [notification, setNotification] = useState<{
		type: 'success' | 'error' | 'info'
		title: string
		message: string
	} | null>(null)

	useEffect(() => {
		if (!isProtected) return

		const loadTier = async () => {
			try {
				const user = await getCurrentUser()
				if (!user) throw new Error('Unable to load current user')
				setUserId(user.id)
				try {
					const checkInStatus = await getCheckInStatus()
					setCheckedInToday(checkInStatus.checkedIn)
				} catch (error) {
					console.error('Error loading check-in status:', error)
					setNotification({
						type: 'error',
						title: 'Unable to load check-in status',
						message: 'Please refresh and try again.',
					})
				}

				const [subscription, tierData] = await Promise.all([
					getUserSubscription(user.id),
					user.tier_id
						? supabase.from('tiers').select('name').eq('id', user.tier_id).maybeSingle()
						: Promise.resolve({ data: null }),
				])

				const tierName = tierData.data?.name || getTierNameFromSubscription(subscription)
				if (tierName !== 'free' && tierName !== 'pro' && tierName !== 'pro_max') {
					throw new Error(`Unknown account tier: ${tierName}`)
				}
				setTier(tierName)
			} catch (error) {
				console.error('Error loading workspace tier:', error)
				setTierError(true)
			} finally {
				setTierLoading(false)
			}
		}

		loadTier()
	}, [isProtected])

	useEffect(() => {
		if (!notification) return
		const timeout = setTimeout(() => setNotification(null), 4500)
		return () => clearTimeout(timeout)
	}, [notification])

	const handleCheckIn = async () => {
		if (!userId) {
			setNotification({
				type: 'error',
				title: 'Check-in failed',
				message: 'Unable to identify your account. Please refresh and try again.',
			})
			return
		}

		if (checkingIn) return

		setCheckingIn(true)
		try {
			const result = await submitCheckIn()
			if (result.alreadyCheckedIn) {
				setCheckedInToday(true)
				setNotification({
					type: 'info',
					title: 'Check-in already confirmed',
					message: 'Come back tomorrow.',
				})
				return
			}

			setCheckedInToday(true)
			setNotification({
				type: 'success',
				title: 'Check-in confirmed',
				message: `+${result.reward.toLocaleString()} RWF`,
			})
		} catch (error) {
			console.error('Error submitting check-in:', error)
			setNotification({
				type: 'error',
				title: 'Check-in failed',
				message: error instanceof Error ? error.message : 'Please try again in a moment.',
			})
		} finally {
			setCheckingIn(false)
		}
	}

	const openWorkspacePage = (path: 'videos' | 'tasks') => {
		if (tier === 'pro' || tier === 'pro_max') {
			router.push(`/${locale}/workspace/${path}`)
		} else {
			router.push(`/${locale}/pricing`)
		}
	}



	return (
		<div className="min-h-screen bg-linear-to-b from-slate-900 via-indigo-950 to-slate-900 pb-24 text-white md:pb-8">
			<SiteHeader locale={locale} />
			<main className="container mx-auto px-4 pt-8">
				<div className="mb-6 flex items-center justify-between">
					<h1 className="text-4xl font-bold">Workspace</h1>
					<button
						type="button"
						onClick={handleCheckIn}
						disabled={checkingIn}
						className="rounded bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-500"
					>
						{checkingIn ? 'Checking in...' : checkedInToday ? 'Checked-in' : 'Check-in'}
					</button>
				</div>
				<p className="mb-8 text-gray-300">Choose how you want to earn today.</p>

				{notification && (
					<div className="fixed right-4 top-4 z-60 w-[calc(100%-2rem)] max-w-sm md:w-full">
						<div
							role="status"
							className={`border bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md ${
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
										<CheckCircle2 size={18} className="mt-0.5 text-emerald-300" />
									) : notification.type === 'error' ? (
										<AlertCircle size={18} className="mt-0.5 text-red-300" />
									) : (
										<Clock3 size={18} className="mt-0.5 text-blue-300" />
									)}
									<div>
										<p className="font-bold text-white">{notification.title}</p>
										<p className="mt-0.5 text-sm text-slate-200">{notification.message}</p>
									</div>
								</div>
								<button
									type="button"
									onClick={() => setNotification(null)}
									className="text-slate-400 transition-colors hover:text-white"
									aria-label="Close notification"
								>
									<X size={18} />
								</button>
							</div>
						</div>
					</div>
				)}

				{tierError ? (
					<p role="alert" className="text-red-300">Unable to load your account tier. Please refresh and try again.</p>
				) : (
					<div className="mx-auto grid max-w-4xl grid-cols-2 gap-3 md:gap-5">
						<button
							type="button"
							onClick={() => openWorkspacePage('videos')}
							className="group relative overflow-hidden border border-blue-500/30 bg-blue-600/20 text-left transition-colors hover:bg-blue-600/30"
						>
							<Image
								src="/images/CTA/video.jpg"
								alt="Watch sponsored videos"
								width={600}
								height={350}
								className="h-32 w-full object-cover opacity-80 transition-opacity group-hover:opacity-100 sm:h-44 md:h-56"
								unoptimized
							/>
							<div className="flex flex-col items-center p-2 text-center sm:p-4">
								<h2 className="mb-2 rounded-lg bg-emerald-600 px-2 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 sm:px-4 sm:text-lg">
									Watch Videos
								</h2>
							</div>
						</button>

						<button
							type="button"
							onClick={() => openWorkspacePage('tasks')}
							className="group relative overflow-hidden border border-blue-500/30 bg-blue-600/20 text-left transition-colors hover:bg-blue-600/30"
						>
							<Image
								src="/images/CTA/tasks.jpg"
								alt="Complete earning tasks"
								width={600}
								height={350}
								className="h-32 w-full object-cover opacity-80 transition-opacity group-hover:opacity-100 sm:h-44 md:h-56"
								unoptimized
							/>
							<div className="flex flex-col items-center p-2 text-center sm:p-4">
								<h2 className="mb-2 rounded-lg bg-emerald-600 px-2 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 sm:px-4 sm:text-lg">
									Quick Tasks
								</h2>
							</div>
						</button>
					</div>
				)}
			</main>
		</div>
	)
}
