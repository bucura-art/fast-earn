'use client'

import { ArrowRight } from 'lucide-react'

interface HomeBannerProps {
	onClaim: () => void
}

export default function HomeBanner({ onClaim }: HomeBannerProps) {
	return (
		<aside className="sticky top-0 z-40 border-b border-emerald-300/20 bg-emerald-400 px-4 py-3 text-slate-950">
			<div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-between">
				<p className="text-center text-sm font-semibold sm:text-left">
					Get <span className="font-extrabold">6,000 RWF bonus</span>
				</p>
				<button
					type="button"
					onClick={onClaim}
					className="inline-flex items-center gap-2 rounded-sm bg-slate-950 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
				>
					Continue
					<ArrowRight size={16} aria-hidden="true" />
				</button>
			</div>
		</aside>
	)
}
