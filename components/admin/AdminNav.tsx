'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks'
import { useState } from 'react'
import {
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Users,
  MessageSquare,
  ClipboardList,
  TrendingUp,
  CreditCard,
  Star,
  ShieldAlert,
  Settings,
  Shield,
} from 'lucide-react'

interface AdminLayoutProps {
  locale: string
}

export default function AdminNav({ locale }: AdminLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isActive = (href: string) => {
    if (!pathname) return false
    if (href === `/${locale}/admin`) return pathname === href
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const navItems = [
    { label: 'Dashboard', href: `/${locale}/admin`, icon: LayoutDashboard },
    { label: 'Users', href: `/${locale}/admin/users`, icon: Users },
    { label: 'Support Chats', href: `/${locale}/admin/chats`, icon: MessageSquare },
    { label: 'Tasks', href: `/${locale}/admin/tasks`, icon: ClipboardList },
    { label: 'Upgrades', href: `/${locale}/admin/upgrades`, icon: TrendingUp },
    { label: 'Withdrawals', href: `/${locale}/admin/withdrawals`, icon: CreditCard },
    { label: 'Subscriptions', href: `/${locale}/admin/subscriptions`, icon: Star },
    { label: 'Fraud Logs', href: `/${locale}/admin/fraud`, icon: ShieldAlert },
    { label: 'Settings', href: `/${locale}/admin/settings`, icon: Settings },
  ]

  const handleLogout = async () => {
    await logout()
    router.push(`/${locale}`)
  }

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden sticky top-0 z-40 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border-b border-emerald-500/30 px-4 py-3 flex items-center justify-between">
        <Link href={`/${locale}/admin`} className="text-lg font-bold text-emerald-400 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Admin
        </Link>
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
        className={`admin-sidebar-scroll fixed lg:sticky left-0 top-14 lg:top-0 h-[calc(100vh-56px)] lg:h-screen lg:shrink-0 w-64 bg-gradient-to-b from-slate-900 via-emerald-950 to-slate-900 border-r border-emerald-500/30 overflow-y-auto transform transition-transform duration-300 z-40 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-6 lg:p-4 h-full flex flex-col">
          {/* Logo - Desktop Only */}
          <Link
            href={`/${locale}/admin`}
            className="hidden lg:flex items-center gap-2 text-2xl font-bold text-emerald-400 hover:text-emerald-300 transition-colors mb-8"
          >
            <Shield className="w-8 h-8" />
            Admin Panel
          </Link>

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
          <div className="px-4 py-4 bg-white/5 rounded-lg border border-white/10">
            <div className="text-sm mb-4">
              <div className="font-bold text-white">{user?.full_name}</div>
              <div className="text-emerald-400 text-xs">ADMIN</div>
            </div>

            <button
              onClick={() => {
                handleLogout()
                setSidebarOpen(false)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-emerald-500 rounded-lg transition-colors text-white font-medium text-sm"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
