import { ReactNode } from 'react'
import Footer from '@/components/general/Footer'
import { SpeedInsights } from "@vercel/speed-insights/next"


interface LocaleLayoutProps {
  children: ReactNode
  params: Promise<{ locale: string }>
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  // Use a fallback to prevent the 'await' from crashing on system pages
  const resolvedParams = await params;
  const locale = resolvedParams?.locale || 'en'; 

  return (
    <>
      <main className="min-h-screen flex flex-col">{children}</main>
      <Footer locale={locale} />
    </>
  )
}
export async function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'rw' }]
}
