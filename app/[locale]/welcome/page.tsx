'use client'

import { useState } from 'react'
import { Check, Gift, MessageCircle, Share2, Users } from 'lucide-react'

const SHARE_MESSAGE = 'I won a 26,000 RWF bonus! Join me and start earning rewards!'

export default function WelcomePage() {
	const [shares, setShares] = useState(0)
	const [redirecting, setRedirecting] = useState(false)

	const handleShare = () => {
		if (redirecting) return

		const nextShares = shares + 1
		setShares(nextShares)
		const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${SHARE_MESSAGE} https://fast-earn.vercel.app/welcome`)}`
		window.open(shareUrl, '_blank', 'noopener,noreferrer')

		if (nextShares === 5) {
			setRedirecting(true)
			window.setTimeout(() => window.location.assign('https://kandebe.com'), 900)
		}
	}

	const progress = (shares / 5) * 100

	return (
		<main className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,_#064e3b_0%,_#022c22_36%,_#020617_78%)] px-4 py-10 text-white">
			<section className="w-full max-w-xl overflow-hidden border border-emerald-200/20 bg-slate-950/75 shadow-2xl shadow-emerald-950/40">
				<div className="border-b border-emerald-300/20 bg-emerald-400 px-6 py-5 text-slate-950">
					<div className="mx-auto flex max-w-md items-center justify-center gap-3">
						<Gift size={25} aria-hidden="true" />
						<p className="text-center text-lg font-extrabold">Congratulations, you won a 26,000 RWF bonus!</p>
					</div>
				</div>

				<div className="px-6 py-9 text-center sm:px-10 sm:py-12">
					<div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-400/10 text-emerald-300">
						<Users size={30} aria-hidden="true" />
					</div>
					<h1 className="text-3xl font-black sm:text-4xl">Share in 5 groups to win more</h1>
					<p className="mt-3 text-base font-medium text-slate-300">Earn 3,000 RWF for every group.</p>

					<div className="mt-9 text-left">
						<div className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-300">
							<span className="tabular-nums text-white">{shares} / 5</span>
						</div>
						<div role="progressbar" aria-label="Groups shared" aria-valuemin={0} aria-valuemax={5} aria-valuenow={shares} className="h-3 overflow-hidden rounded-full bg-white/10">
							<div className="h-full rounded-full bg-emerald-400 transition-[width] duration-500" style={{ width: `${progress}%` }} />
						</div>
						<div className="mt-3 flex justify-between" aria-hidden="true">
							{Array.from({ length: 5 }, (_, index) => (
								<span key={index} className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs ${index < shares ? 'border-emerald-300 bg-emerald-400 text-slate-950' : 'border-white/15 text-slate-500'}`}>
									{index < shares ? <Check size={14} /> : index + 1}
								</span>
							))}
						</div>
					</div>

					<button type="button" onClick={handleShare} disabled={redirecting} className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-sm bg-emerald-400 px-6 py-3 font-extrabold text-slate-950 transition-colors hover:bg-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300 disabled:cursor-wait disabled:opacity-70">
						<Share2 size={18} aria-hidden="true" />
						{redirecting ? 'Continuing...' : shares === 0 ? 'Share' : 'Share again'}
					</button>
				</div>
			</section>
			<a href="https://kandebe.com" className="mt-4 inline-flex min-h-12 w-full max-w-xl items-center justify-center rounded-sm bg-blue-600 px-6 py-3 font-extrabold text-white transition-colors hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-400">
				Withdraw bonus
			</a>
		</main>
	)
}
