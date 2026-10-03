'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import SiteHeader from '@/components/general/SiteHeader'
import PageLoading from '@/components/general/PageLoading'
import { useProtectedRoute } from '@/lib/hooks'
import supabase from '@/lib/supabaseClient'

interface MyProduct {
  id: string
  product_code: string
  product_name: string
  purchase_price: number
  daily_income: number
  duration_days: number
  approved_at: string | null
  starts_at: string | null
  ends_at: string | null
  created_at: string
  earned_so_far: number
  total_potential_income: number
  remaining_income: number
  days_remaining: number | null
}

interface MyProductsPageProps {
  params: Promise<{ locale: string }>
}

const formatRwf = (amount: number) => `${Number(amount || 0).toLocaleString('en-GB')} RWF`

export default function MyProductsPage({ params }: MyProductsPageProps) {
  const { locale } = use(params)
  const { isProtected } = useProtectedRoute()
  const [products, setProducts] = useState<MyProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isProtected) return

    let cancelled = false

    const loadProducts = async () => {
      setLoading(true)
      setErrorMessage(null)
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError

        const accessToken = sessionData.session?.access_token
        if (!accessToken) throw new Error('Your session has expired. Please sign in again.')

        const response = await fetch('/api/my-product-purchases', {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        })
        const result = (await response.json()) as { products?: MyProduct[]; error?: string }
        if (!response.ok) throw new Error(result.error || 'Unable to load your products.')

        if (!cancelled) setProducts(result.products || [])
      } catch (error) {
        console.error('Error loading your products:', error)
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load your products.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadProducts()
    return () => {
      cancelled = true
    }
  }, [isProtected])

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-900 via-indigo-950 to-slate-900 pb-24 text-white md:pb-0">
      <SiteHeader locale={locale} />
      <main className="container mx-auto max-w-6xl px-4 py-12 md:py-16">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">My Products</h1>
          </div>
          <Link
            href={`/${locale}/invest`}
            className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-emerald-500"
          >
            Buy Products
          </Link>
        </header>

        {loading ? (
          <PageLoading className="min-h-48" />
        ) : errorMessage ? (
          <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-red-300">
            {errorMessage}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <h2 className="mb-2 text-xl font-semibold">You have no products</h2>
            <Link
              href={`/${locale}/invest`}
              className="inline-flex rounded-lg bg-blue-600 px-5 py-3 font-bold text-white transition-colors hover:bg-blue-500"
            >
              Buy Products
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {products.map((product) => {
              const isActive = product.days_remaining === null || product.days_remaining > 0

              return (
                <article key={product.id} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold">{product.product_name}</h2>
                      <p className="mt-1 text-sm uppercase text-gray-400">{product.product_code}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        isActive ? 'bg-green-900/40 text-green-300' : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      {isActive ? 'Active' : 'Completed'}
                    </span>
                  </div>

                  <dl className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl bg-black/20 p-4">
                      <dt className="text-sm text-gray-400">Earned</dt>
                      <dd className="mt-1 text-xl font-bold text-emerald-300">{formatRwf(product.earned_so_far)}</dd>
                    </div>
                    <div className="rounded-xl bg-black/20 p-4">
                      <dt className="text-sm text-gray-400">Income left</dt>
                      <dd className="mt-1 text-xl font-bold text-white">{formatRwf(product.remaining_income)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-400">Time remaining</dt>
                      <dd className="mt-1 font-semibold text-white">
                        {product.days_remaining === null
                          ? 'Schedule not available'
                          : product.days_remaining > 0
                            ? `${product.days_remaining} ${product.days_remaining === 1 ? 'day' : 'days'}`
                            : 'Completed'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-400">Daily income</dt>
                      <dd className="mt-1 font-semibold text-white">{formatRwf(product.daily_income)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-400">Product duration</dt>
                      <dd className="mt-1 font-semibold text-white">{product.duration_days} days</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-400">Purchase price</dt>
                      <dd className="mt-1 font-semibold text-white">{formatRwf(product.purchase_price)}</dd>
                    </div>
                    {product.ends_at && (
                      <div className="sm:col-span-2">
                        <dt className="text-sm text-gray-400">Earning period ends</dt>
                        <dd className="mt-1 font-semibold text-white">
                          {new Date(product.ends_at).toLocaleDateString('en-GB')}
                        </dd>
                      </div>
                    )}
                  </dl>
                </article>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
