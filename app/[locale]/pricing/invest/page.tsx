import InvestRequestClient from './InvestRequestClient'

interface InvestRequestPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ product?: string | string[] }>
}

export default async function InvestRequestPage({ params, searchParams }: InvestRequestPageProps) {
  const [{ locale }, query] = await Promise.all([params, searchParams])
  const productCode = Array.isArray(query.product) ? query.product[0] : query.product

  if (!productCode) {
    return <InvestRequestClient locale={locale} productCode="" />
  }

  return <InvestRequestClient locale={locale} productCode={productCode} />
}