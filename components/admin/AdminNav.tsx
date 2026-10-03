'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/hooks'
import { useState } from 'react'
import {
  Menu,
  X,
  LayoutDashboard,
  Users,
  MessageSquare,
  ClipboardList,
  TrendingUp,
  CreditCard,
  Star,
  ShieldAlert,
  Settings,
} from 'lucide-react'

interface AdminLayoutProps {
  locale: string
}

export default function AdminNav({ locale }: AdminLayoutProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isActive = (href: string) => {
    if (!pathname) return false
    if (href === `/${locale}/admin`) return pathname === href
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const navItems = [
    { label: 'Dashboard', href: `/${locale}/admin`, icon: LayoutDashboard },
    { label: 'Users Mngmt', href: `/${locale}/admin/users`, icon: Users },
    { label: 'Investors', href: `/${locale}/admin/investors`, icon: TrendingUp },
    { label: 'Withdrawals', href: `/${locale}/admin/withdrawals`, icon: CreditCard },
    { label: 'Membership', href: `/${locale}/admin/membership`, icon: Star },
    { label: 'Support', href: `/${locale}/admin/chats`, icon: MessageSquare },
    { label: 'Tasks Mngmt', href: `/${locale}/admin/tasks`, icon: ClipboardList },
    { label: 'Fraud Logs', href: `/${locale}/admin/fraud`, icon: ShieldAlert },
    { label: 'System Settings', href: `/${locale}/admin/settings`, icon: Settings },
  ]

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden sticky top-0 z-40 bg-linear-to-r from-slate-900 via-emerald-950 to-slate-900 border-b border-emerald-500/30 px-4 py-3 flex items-center justify-between">
        <div className="text-lg font-bold text-emerald-400 flex items-center gap-2">
          <div className="relative h-5 w-8">
            <Image src="/images/dollar-notes.png" alt="Dollar notes" fill sizes="32px" className="object-contain" />
          </div>
          FASTANA
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`admin-sidebar-scroll fixed lg:sticky left-0 top-14 lg:top-0 h-[calc(100vh-56px)] lg:h-screen lg:shrink-0 w-64 bg-linear-to-b from-slate-900 via-emerald-950 to-slate-900 border-r border-emerald-500/30 overflow-y-auto transform transition-transform duration-300 z-40 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-6 lg:p-4 h-full flex flex-col">
          {/* Logo - Desktop Only */}
          <div className="sticky top-0 z-10 -mx-6 -mt-6 mb-8 bg-slate-900 px-6 pt-6 pb-3 lg:-mx-4 lg:-mt-4 lg:px-4 lg:pt-4">
            <div className="hidden lg:flex items-center gap-2 text-2xl font-bold text-white">
              <div className="relative h-8 w-12">
                <Image src="/images/dollar-notes.png" alt="Dollar notes" fill sizes="48px" className="object-contain" />
              </div>
              FASTANA
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-2 flex-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm ${
                  isActive(item.href)
                    ? item.label === 'Fraud Logs'
                      ? 'bg-red-600 text-white'
                      : 'bg-emerald-600 text-white'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Divider */}
          <div className="my-6 border-t border-emerald-500/30" />

          {/* Admin Profile Section */}
          <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-4">
            <Link
              href={`/${locale}/admin/profile`}
              onClick={() => setSidebarOpen(false)}
              className="mb-4 flex items-center gap-3 rounded-md text-sm text-white transition-colors hover:text-emerald-300"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/20 font-bold text-emerald-200">
                {(user?.full_name?.trim().charAt(0) || 'A').toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-bold text-white">{user?.full_name || 'Admin Account'}</span>
                <span className="block text-xs text-emerald-400">Account details</span>
              </span>
            </Link>

          </div>
        </div>
      </aside>
    </>
  )
}
