import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey)
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
const PAGE_SIZE = 1000
const DAY_IN_MS = 24 * 60 * 60 * 1000

interface ApprovedPurchase {
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
}

interface ProductEarning {
  purchase_request_id: string
  amount: number
}

export async function GET(request: NextRequest) {
  const authorization = request.headers.get('authorization')
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : ''

  if (!token) {
    return NextResponse.json({ error: 'You must be signed in to view your products.' }, { status: 401 })
  }

  const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token)
  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Your session is invalid. Please sign in again.' }, { status: 401 })
  }

  try {
    if (request.nextUrl.searchParams.get('summary') === 'today') {
      const today = new Date().toISOString().slice(0, 10)
      const todayStart = `${today}T00:00:00.000Z`
      const todayEnd = `${today}T23:59:59.999Z`
      let activeProductCount = 0
      let expectedAmount = 0
      for (let offset = 0; ; offset += PAGE_SIZE) {
        const { data, error } = await supabaseAdmin
          .from('product_purchase_requests')
          .select('daily_income')
          .eq('user_id', authData.user.id)
          .eq('status', 'approved')
          .lte('starts_at', todayEnd)
          .gte('ends_at', todayStart)
          .range(offset, offset + PAGE_SIZE - 1)

        if (error) throw error

        const rows = data || []
        activeProductCount += rows.length
        expectedAmount += rows.reduce(
          (total, product) => total + Number(product.daily_income || 0),
          0
        )
        if (rows.length < PAGE_SIZE) break
      }

      let creditedAmount = 0
      for (let offset = 0; ; offset += PAGE_SIZE) {
        const { data, error } = await supabaseAdmin
          .from('product_earnings')
          .select('amount')
          .eq('user_id', authData.user.id)
          .eq('earning_date', today)
          .range(offset, offset + PAGE_SIZE - 1)

        if (error) throw error

        const rows = data || []
        creditedAmount += rows.reduce(
          (total, earning) => total + Number(earning.amount || 0),
          0
        )
        if (rows.length < PAGE_SIZE) break
      }

      const status = activeProductCount === 0
        ? 'no_product'
        : creditedAmount > 0
          ? 'credited'
          : 'pending'

      return NextResponse.json(
        {
          todayIncome: {
            amount: status === 'pending' ? expectedAmount : creditedAmount,
            status,
          },
        },
        { headers: { 'Cache-Control': 'private, no-store' } }
      )
    }

    const purchases: ApprovedPurchase[] = []

    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabaseAdmin
        .from('product_purchase_requests')
        .select('id, product_code, product_name, purchase_price, daily_income, duration_days, approved_at, starts_at, ends_at, created_at')
        .eq('user_id', authData.user.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .order('id', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1)

      if (error) throw error

      const rows = (data || []) as ApprovedPurchase[]
      purchases.push(...rows)
      if (rows.length < PAGE_SIZE) break
    }

    const earnedByPurchase = new Map<string, number>()
    for (let offset = 0; offset < purchases.length; offset += 100) {
      const purchaseIds = purchases.slice(offset, offset + 100).map((purchase) => purchase.id)

      for (let earningsOffset = 0; ; earningsOffset += PAGE_SIZE) {
        const { data, error } = await supabaseAdmin
          .from('product_earnings')
          .select('purchase_request_id, amount')
          .eq('user_id', authData.user.id)
          .in('purchase_request_id', purchaseIds)
          .order('earning_date', { ascending: true })
          .order('id', { ascending: true })
          .range(earningsOffset, earningsOffset + PAGE_SIZE - 1)

        if (error) throw error

        const rows = (data || []) as ProductEarning[]
        for (const earning of rows) {
          earnedByPurchase.set(
            earning.purchase_request_id,
            (earnedByPurchase.get(earning.purchase_request_id) || 0) + Number(earning.amount || 0)
          )
        }
        if (rows.length < PAGE_SIZE) break
      }
    }

    const today = new Date()
    const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    const products = purchases.map((purchase) => {
      const earnedSoFar = earnedByPurchase.get(purchase.id) || 0
      const totalPotentialIncome = Number(purchase.daily_income) * Number(purchase.duration_days)
      const endDate = purchase.ends_at
        ? new Date(purchase.ends_at)
        : purchase.approved_at
          ? new Date(new Date(purchase.approved_at).getTime() + (purchase.duration_days - 1) * DAY_IN_MS)
          : null
      const endDateUtc = endDate
        ? Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate())
        : null
      const daysRemaining =
        endDateUtc === null
          ? null
          : Math.min(
              Number(purchase.duration_days),
              Math.max(0, Math.floor((endDateUtc - todayUtc) / DAY_IN_MS) + 1)
            )

      return {
        ...purchase,
        earned_so_far: earnedSoFar,
        total_potential_income: totalPotentialIncome,
        remaining_income: Math.max(0, totalPotentialIncome - earnedSoFar),
        days_remaining: daysRemaining,
      }
    })

    return NextResponse.json(
      { products },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch (error) {
    console.error('Error loading user product purchases:', error)
    return NextResponse.json({ error: 'Unable to load your products right now.' }, { status: 500 })
  }
}
