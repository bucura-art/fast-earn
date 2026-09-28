import { ReactNode } from 'react'
import type { Metadata } from 'next'
import AdminNav from '@/components/admin/AdminNav'

export const metadata: Metadata = {
  title: 'Fast Earn - Admin Panel',
  description: 'Administrator dashboard for Fast Earn platform',
}

interface AdminLayoutProps {
  children: ReactNode
  params: Promise<{ locale: string }>
}

export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const { locale } = await params
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-1 flex-col lg:flex-row">
        <AdminNav locale={locale} />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
