'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BriefcaseBusiness, LayoutDashboard, TrendingUp, Wallet } from 'lucide-react'

interface SiteNavProps {
	locale: string
	showDesktopLinks?: boolean
}

export default function SiteNav({ locale, showDesktopLinks = false }: SiteNavProps) {
	const pathname = usePathname()
	const links = [
		{ label: 'Dashboard', href: `/${locale}/dashboard`, icon: LayoutDashboard },
		{ label: 'Workspace', href: `/${locale}/workspace`, icon: BriefcaseBusiness },
		{ label: 'Invest', href: `/${locale}/invest`, icon: TrendingUp },
		{ label: 'Wallet', href: `/${locale}/wallet`, icon: Wallet },
	]

	const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

	return (
		<>
			{showDesktopLinks && (
				<nav aria-label="Main navigation" className="hidden items-center gap-2 md:flex">
					{links.map(({ label, href, icon: Icon }) => (
						<Link
							key={href}
							href={href}
							aria-current={isActive(href) ? 'page' : undefined}
							className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold transition-colors ${
								isActive(href) ? 'bg-black/20 text-white' : 'text-white/80 hover:bg-black/10 hover:text-white'
							}`}
						>
							<Icon size={17} aria-hidden="true" />
							{label}
						</Link>
					))}
				</nav>
			)}

			<nav
				aria-label="Main navigation"
				className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-white/15 bg-slate-950/95 pb-[env(safe-area-inset-bottom)] text-white shadow-[0_-8px_24px_rgba(0,0,0,0.25)] backdrop-blur md:hidden"
			>
				{links.map(({ label, href, icon: Icon }) => (
					<Link
						key={href}
						href={href}
						aria-current={isActive(href) ? 'page' : undefined}
						className={`flex min-h-16 flex-col items-center justify-center gap-1 border-t-2 text-xs font-semibold transition-colors ${
							isActive(href) ? 'border-emerald-400 bg-white/5 text-emerald-300' : 'border-transparent text-slate-300 hover:text-white'
						}`}
					>
						<Icon size={20} aria-hidden="true" />
						{label}
					</Link>
				))}
			</nav>
		</>
	)
}
