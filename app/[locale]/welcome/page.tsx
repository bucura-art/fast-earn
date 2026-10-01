'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Check, Share2 } from 'lucide-react'

const SHARE_MESSAGE = `Join Fast Earn and start earning rewards!
👇👇👇
https://fast-earn.vercel.app/welcome`

export default function WelcomePage() {
	const [shares, setShares] = useState(0)

	const handleShare = () => {
		if (shares >= 5) return

		const nextShares = shares + 1
		setShares(nextShares)
		const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(SHARE_MESSAGE)}`
		window.open(shareUrl, '_blank', 'noopener,noreferrer')
	}

	const progress = (shares / 5) * 100

	return (
		<main className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,_#064e3b_0%,_#022c22_36%,_#020617_78%)] px-4 py-10 text-white">
			<section className="w-full max-w-xl overflow-hidden border border-emerald-200/20 bg-slate-950/75 shadow-2xl shadow-emerald-950/40">
				<div className="border-b border-emerald-300/20 bg-emerald-400 px-6 py-5 text-slate-950">
					<div className="mx-auto flex max-w-md items-center justify-center">
						<p className="text-center text-lg font-extrabold">Referral welcome bonus</p>
					</div>
				</div>

				<div className="px-6 py-9 text-center sm:px-10 sm:py-12">
					<div className="relative mx-auto mb-6 h-20 w-32">
						<Image src="/images/dollar-notes.png" alt="Dollar notes" fill sizes="128px" className="object-contain" />
					</div>
					<h1 className="text-3xl font-black sm:text-4xl">Invite friends to join Fast Earn</h1>
					<p className="mt-3 text-base font-medium text-slate-300">Earn a one-time 3,000 RWF when a friend registers with your referral link. They receive a 6,000 RWF welcome bonus.</p>

					<div className="mt-9 text-left">
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

					<button type="button" onClick={handleShare} disabled={shares >= 5} className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-sm bg-emerald-400 px-6 py-3 font-extrabold text-slate-950 transition-colors hover:bg-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300 disabled:cursor-not-allowed disabled:opacity-60">
						<Share2 size={18} aria-hidden="true" />
						{shares >= 5 ? 'Sharing complete' : shares === 0 ? 'Share' : 'Share again'}
					</button>
				</div>
			</section>
			<button type="button" onClick={() => window.location.assign('https://example.com')} disabled={shares < 5} className="mt-4 inline-flex min-h-12 w-full max-w-xl items-center justify-center rounded-sm bg-blue-600 px-6 py-3 font-extrabold text-white transition-colors hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">
				Continue
			</button>
		</main>
	)
}
