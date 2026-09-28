'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { FileText, Globe, Headset, MoreVertical, Settings, Shield } from 'lucide-react'
import SiteNav from '@/components/general/SiteNav'

interface SiteHeaderProps {
	locale: string
	onChangeLanguage?: () => void
}

export default function SiteHeader({ locale, onChangeLanguage }: SiteHeaderProps) {
	const [menuOpen, setMenuOpen] = useState(false)
	const menuRef = useRef<HTMLDivElement | null>(null)

	useEffect(() => {
		const handlePointerDown = (event: PointerEvent) => {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				setMenuOpen(false)
			}
		}

		document.addEventListener('pointerdown', handlePointerDown)
		return () => document.removeEventListener('pointerdown', handlePointerDown)
	}, [])

	const closeMenu = () => setMenuOpen(false)

	return (
		<header className="sticky top-0 z-50 bg-gradient-to-r from-blue-600 to-emerald-500 shadow-lg">
			<div className="container mx-auto flex items-center justify-between px-4 py-4">
				<Link href={`/${locale}/dashboard`} className="text-2xl font-bold text-white">
					FastEarn
				</Link>
				<SiteNav locale={locale} showDesktopLinks />
				<div className="relative" ref={menuRef}>
					<button
						type="button"
						onClick={() => setMenuOpen((open) => !open)}
						aria-label="Menu"
						aria-expanded={menuOpen}
						aria-controls="site-header-menu"
						className="rounded-lg bg-black p-2 text-white transition-colors hover:bg-gray-900"
					>
						<MoreVertical size={20} aria-hidden="true" />
					</button>

					{menuOpen && (
						<div
							id="site-header-menu"
							className="absolute right-0 z-20 mt-2 flex w-64 flex-col gap-1 rounded-xl border border-white/20 bg-gradient-to-br from-blue-600 to-emerald-500 p-2 shadow-2xl backdrop-blur-md"
						>
							<Link
								href={`/${locale}/support`}
								onClick={closeMenu}
								className="flex items-center gap-3 rounded-lg px-4 py-3 font-semibold text-white transition-colors hover:bg-white/15"
							>
								<Headset size={25} className="rounded bg-black p-1" />
								<span>Contact support</span>
							</Link>
							<Link
								href={`/${locale}/dashboard/profile`}
								onClick={closeMenu}
								className="flex items-center gap-3 rounded-lg px-4 py-3 font-semibold text-white transition-colors hover:bg-white/15"
							>
								<Settings size={25} className="rounded bg-black p-1" />
								<span>Account settings</span>
							</Link>
							{onChangeLanguage && (
								<button
									type="button"
									onClick={() => {
										closeMenu()
										onChangeLanguage()
									}}
									className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left font-semibold text-white transition-colors hover:bg-white/15"
								>
									<Globe size={25} className="rounded bg-black p-1" />
									<span>Change Language</span>
								</button>
							)}
							<Link
								href={`/${locale}/privacy`}
								onClick={closeMenu}
								className="flex items-center gap-3 rounded-lg px-4 py-3 font-semibold text-white transition-colors hover:bg-white/15"
							>
								<Shield size={25} className="rounded bg-black p-1" />
								<span>Privacy Policy</span>
							</Link>
							<Link
								href={`/${locale}/terms`}
								onClick={closeMenu}
								className="flex items-center gap-3 rounded-lg px-4 py-3 font-semibold text-white transition-colors hover:bg-white/15"
							>
								<FileText size={25} className="rounded bg-black p-1" />
								<span>Terms of Service</span>
							</Link>
						</div>
					)}
				</div>
			</div>
		</header>
	)
}
