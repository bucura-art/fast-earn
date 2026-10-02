'use client'

import Link from 'next/link'
import { useState } from 'react'
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
  const [submitted, setSubmitted] = useState(false)
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
          <InvestChatWidget product={product} onSubmitted={() => setSubmitted(true)} />
        ) : (
          <div role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-5 text-red-200">
            This product is not available. Return to products and choose a listed VIP product.
          </div>
        )}

        {submitted && (
          <p role="status" className="mx-auto mt-4 max-w-xl rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
            Your purchase request was submitted and is awaiting review.
          </p>
        )}
      </div>
    </div>
  )
}