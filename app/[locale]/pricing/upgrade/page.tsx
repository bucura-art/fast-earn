import { Suspense } from 'react'
import PageLoading from '@/components/general/PageLoading'
import UpgradeRequestClient from './UpgradeRequestClient'

interface UpgradeRequestPageProps {
  params: Promise<{ locale: string }>
}

export default async function UpgradeRequestPage({ params }: UpgradeRequestPageProps) {
  const { locale } = await params
  return (
    <Suspense fallback={<PageLoading />}>
      <UpgradeRequestClient locale={locale} />
    </Suspense>
  )
}
