import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getVipProduct } from '@/lib/products'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey)
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('authorization')
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : ''

  if (!token) {
    return NextResponse.json({ error: 'You must be signed in to submit a purchase request.' }, { status: 401 })
  }

  const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token)
  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Your session is invalid. Please sign in again.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const requestBody = body as { productCode?: unknown; paidPhone?: unknown }
  if (typeof requestBody.productCode !== 'string' || typeof requestBody.paidPhone !== 'string') {
    return NextResponse.json({ error: 'A product and payment phone number are required.' }, { status: 400 })
  }

  const product = getVipProduct(requestBody.productCode)
  if (!product) {
    return NextResponse.json({ error: 'The selected product is not available.' }, { status: 400 })
  }

  const paidPhone = requestBody.paidPhone.trim()
  if (!/^[0-9+]{8,15}$/.test(paidPhone)) {
    return NextResponse.json({ error: 'Enter a valid payment phone number.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('product_purchase_requests')
    .insert({
      user_id: authData.user.id,
      product_code: product.code,
      product_name: product.name,
      purchase_price: product.price,
      daily_income: product.dailyIncome,
      duration_days: product.durationDays,
      paid_phone: paidPhone,
    })
    .select('id, status, created_at')
    .single()

  if (error) {
    console.error('Error creating product purchase request:', error)
    return NextResponse.json({ error: 'Could not submit the purchase request. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ purchaseRequest: data }, { status: 201 })
}
