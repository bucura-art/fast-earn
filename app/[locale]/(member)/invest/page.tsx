'use client'

import { use } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import SiteHeader from '@/components/general/SiteHeader'
import { VIP_PRODUCTS } from '@/lib/products'

const formatRwf = (amount: number) => `${amount.toLocaleString()} RWF`

interface InvestPageProps {
  params: Promise<{ locale: string }>
}

export default function InvestPage({ params }: InvestPageProps) {
  const { locale } = use(params)

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-900 via-indigo-950 to-slate-900 pb-24 text-white md:pb-0">
      <SiteHeader locale={locale} />
      <main className="container mx-auto px-4 py-12 md:py-16">
        <header className="mb-10">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h1 className="text-4xl font-bold">Products</h1>
            <Link
              href={`/${locale}/invest/manage`}
              className="shrink-0 rounded bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-500"
            >
              My products
            </Link>
          </div>
        </header>

        <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {VIP_PRODUCTS.map((product, index) => {
            const totalIncome = product.dailyIncome * product.durationDays

            return (
              <article
                key={product.name}
                className={`relative flex flex-col rounded-2xl border bg-white/5 p-4 shadow-xl ${
                  index === 1
                    ? 'border-2 border-blue-500 shadow-blue-900/20'
                    : 'border-white/10'
                }`}
              >
                <div className="relative mb-3 h-40 overflow-hidden rounded-xl bg-white">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
                    className="object-contain p-2 drop-shadow-[0_12px_16px_rgba(0,0,0,0.35)]"
                  />
                </div>
                <h2 className="mb-1 text-xl font-bold">{product.name}</h2>

                <dl className="mb-5 grow space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray-300">Daily</dt>
                    <dd className="font-semibold">{formatRwf(product.dailyIncome)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray-300">Duration</dt>
                    <dd className="font-semibold">{product.durationDays} days</dd>
                  </div>
                  <div className="flex justify-between gap-2 border-t border-white/10 pt-2">
                    <dt className="text-gray-300">Total</dt>
                    <dd className="font-semibold text-emerald-300">{formatRwf(totalIncome)}</dd>
                  </div>
                </dl>

                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 text-xl font-bold leading-tight text-emerald-400">
                    {formatRwf(product.price)}
                  </p>
                  <Link
                    href={`/${locale}/pricing/invest?product=${encodeURIComponent(product.code)}`}
                    className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-center font-bold text-white transition-colors hover:bg-blue-500"
                  >
                    Buy
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      </main>
    </div>
  )
}