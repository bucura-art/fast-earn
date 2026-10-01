import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
  throw new Error('Missing Supabase env vars')
}

const supabase = createClient(supabaseUrl, serviceRoleKey)
const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey)

function getBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return null
  return authorization.slice('Bearer '.length).trim() || null
}

async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const token = getBearerToken(request)
  if (!token) return null

  const { data, error } = await supabaseAuth.auth.getUser(token)
  if (error || !data.user) return null
  return data.user.id
}

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request)
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('check_ins')
    .select('id')
    .eq('user_id', userId)
    .eq('check_in_date', today)
    .maybeSingle()

  if (error) {
    console.error('Error loading check-in status:', error)
    return NextResponse.json({ success: false, error: 'Unable to load check-in status.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, checkedIn: Boolean(data) })
}

export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request)
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase.rpc('complete_daily_check_in', {
    p_user_id: userId,
  })

  if (error) {
    console.error('Error completing check-in:', error)
    return NextResponse.json({ success: false, error: 'Unable to complete check-in. Please try again.' }, { status: 500 })
  }

  const result = Array.isArray(data) ? data[0] : data
  if (!result) {
    console.error('Check-in RPC returned no result for user:', userId)
    return NextResponse.json({ success: false, error: 'Unable to complete check-in. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    checkedIn: true,
    alreadyCheckedIn: result.already_checked_in,
    reward: Number(result.reward_amount),
    balance: Number(result.balance_after),
  })
}
