import { ReactNode } from 'react'
import { SpeedInsights } from "@vercel/speed-insights/next"


interface LocaleLayoutProps {
  children: ReactNode
}

export default function LocaleLayout({ children }: LocaleLayoutProps) {
  return (
    <main className="min-h-screen flex flex-col">{children}</main>
  )
}
export async function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'rw' }]
}
