'use client'

import Link from 'next/link'
import InvestChatWidget from '@/components/chat/InvestChatWidget'
import PageLoading from '@/components/general/PageLoading'
import { useProtectedRoute } from '@/lib/hooks'
import { getVipProduct } from '@/lib/products'

interface InvestRequestClientProps {
  locale: string
  productCode: string
}

export default function InvestRequestClient({ locale, productCode }: InvestRequestClientProps) {
  const { isProtected } = useProtectedRoute()
  const product = getVipProduct(productCode)

  if (!isProtected) return <PageLoading />

  return (
    <div className="relative min-h-screen bg-linear-to-b from-slate-900 via-indigo-950 to-slate-900 px-4 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <Link href={`/${locale}/invest`} className="mb-6 inline-block text-sm text-gray-300 hover:text-white">
          Back to products
        </Link>
        <h1 className="mb-8 text-center text-3xl font-bold">Purchase VIP product</h1>

        {product ? (
          <InvestChatWidget locale={locale} product={product} />
        ) : (
          <div role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-5 text-red-200">
            This product is not available. Return to products and choose a listed VIP product.
          </div>
        )}
      </div>
    </div>
  )
}