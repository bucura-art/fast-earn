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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authorization = request.headers.get('authorization')
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : ''

  if (!token) {
    return NextResponse.json({ error: 'You must be signed in to process investment requests.' }, { status: 401 })
  }

  const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token)
  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Your session is invalid. Please sign in again.' }, { status: 401 })
  }

  const { data: admin, error: adminError } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (adminError) {
    console.error('Error checking investment request admin access:', adminError)
    return NextResponse.json({ error: 'Could not verify admin access.' }, { status: 500 })
  }
  if (admin?.role !== 'admin') {
    return NextResponse.json({ error: 'You are not authorized to process investment requests.' }, { status: 403 })
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

  const status = (body as { status?: unknown }).status
  if (status !== 'approved' && status !== 'rejected') {
    return NextResponse.json({ error: 'Status must be approved or rejected.' }, { status: 400 })
  }

  const { id } = await params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid investment request ID.' }, { status: 400 })
  }

  try {
    if (status === 'approved') {
      const { data, error } = await supabaseAdmin.rpc('approve_product_purchase_request', {
        p_request_id: id,
      })

      if (error) throw error
      return NextResponse.json({ purchaseRequest: data })
    }

    const { data, error } = await supabaseAdmin
      .from('product_purchase_requests')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'pending')
      .select('id, status')
      .maybeSingle()

    if (error) throw error
    if (!data) {
      return NextResponse.json({ error: 'Pending investment request not found.' }, { status: 404 })
    }

    return NextResponse.json({ purchaseRequest: data })
  } catch (error) {
    console.error('Error processing investment request:', error)
    return NextResponse.json({ error: 'Could not process the investment request.' }, { status: 500 })
  }
}
