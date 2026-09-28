import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { TIER_MULTIPLIERS } from '@/lib/tierUtils'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
  throw new Error('Missing Supabase env vars')
}

const supabase = createClient(supabaseUrl, serviceRoleKey)
const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey)

const REFERRAL_BONUS_BY_TIER: Record<string, number> = {
  free: 0.05,
  pro: 0.10,
  pro_max: 0.20,
}

const DAILY_TASK_LIMITS: Record<string, number> = {
  free: 5,
  pro: 10,
  pro_max: 20,
}

const parseBearerToken = (request: NextRequest): string | null => {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.slice('Bearer '.length).trim()
}

const getTierName = async (userId: string): Promise<string> => {
  // Try active subscription first (with full tier data including multiplier)
  const { data: subData, error: subError } = await supabase
    .from('subscriptions')
    .select('*, tier:tier_id(id, name, reward_multiplier)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (subError) {
    console.warn(`[getTierName] Subscription query error for user ${userId}:`, subError)
  } else if (subData) {
    // Check if subscription has expired
    const endDate = subData.end_date ? new Date(subData.end_date) : null
    if (endDate && new Date() > endDate) {
      console.warn(`[getTierName] Subscription expired for user ${userId} on ${endDate.toISOString()}`)
      // Get free tier ID and downgrade
      try {
        const { data: freeTier } = await supabase
          .from('tiers')
          .select('id')
          .eq('name', 'free')
          .single()

        if (freeTier) {
          // Update user tier
          await supabase.from('users').update({ tier_id: freeTier.id }).eq('id', userId)
          // Mark subscription as expired
          await supabase
            .from('subscriptions')
            .update({ status: 'expired' })
            .eq('id', subData.id)
          console.log(`[getTierName] User ${userId} downgraded to free tier due to expiration`)
        }
      } catch (error) {
        console.error('Error handling expired subscription:', error)
      }
      // Continue with free tier
      return 'free'
    }

    const subTier = Array.isArray(subData.tier) ? subData.tier[0] : subData.tier
    if (subTier?.name) {
      console.log(`[getTierName] Found active subscription: user=${userId}, tier=${subTier.name}`)
      return subTier.name
    }
  }

  // Fallback to user profile tier
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*, tier:tier_id(id, name)')
    .eq('id', userId)
    .maybeSingle()

  if (userError) {
    console.warn(`[getTierName] User query error for user ${userId}:`, userError)
  } else if (userData) {
    const userTier = Array.isArray(userData.tier) ? userData.tier[0] : userData.tier
    if (userTier?.name) {
      console.log(`[getTierName] Found user tier: user=${userId}, tier=${userTier.name}`)
      return userTier.name
    }
  }

  console.warn(`[getTierName] No tier found for user ${userId}, defaulting to 'free'`)
  return 'free'
}

const getTodayTaskCount = async (userId: string): Promise<number> => {
  try {
    // Use UTC midnight to ensure consistent daily resets across all timezones
    const today = new Date()
    const utcMidnight = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0))

    const { data, error } = await supabase
      .from('task_completions')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .gte('created_at', utcMidnight.toISOString())
      .eq('status', 'approved')

    if (error) throw error
    return data?.length || 0
  } catch (error) {
    console.error('Get today task count error:', error)
    return 0
  }
}

const creditReferralBonus = async (userId: string, rewardAmount: number) => {
  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('referred_by')
      .eq('id', userId)
      .single()

    if (userError) throw userError
    if (!user?.referred_by) return

    const tierName = await getTierName(userId)
    const bonusRate = REFERRAL_BONUS_BY_TIER[tierName] ?? REFERRAL_BONUS_BY_TIER.free
    const bonusAmount = Math.round(rewardAmount * bonusRate * 100) / 100
    if (bonusAmount <= 0) return

    const { data: referral, error: referralError } = await supabase
      .from('referrals')
      .select('id, reward')
      .eq('referrer_id', user.referred_by)
      .eq('referred_user_id', userId)
      .maybeSingle()

    if (referralError || !referral) return

    const nextReferralReward = Number(referral.reward || 0) + bonusAmount

    const { error: updateReferralError } = await supabase
      .from('referrals')
      .update({ reward: nextReferralReward })
      .eq('id', referral.id)

    if (updateReferralError) throw updateReferralError

    const { data: referrer, error: referrerError } = await supabase
      .from('users')
      .select('balance, referral_earnings')
      .eq('id', user.referred_by)
      .single()

    if (referrerError) throw referrerError

    const { error: updateReferrerError } = await supabase
      .from('users')
      .update({
        balance: Number(referrer.balance || 0) + bonusAmount,
        referral_earnings: Number(referrer.referral_earnings || 0) + bonusAmount,
      })
      .eq('id', user.referred_by)

    if (updateReferrerError) throw updateReferrerError

    const { error: referralTxError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: user.referred_by,
        type: 'credit',
        amount: bonusAmount,
        reference_type: 'referral_bonus',
        reference_id: referral.id,
      })

    if (referralTxError) throw referralTxError
  } catch (error) {
    console.warn('Referral bonus credit failed:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = parseBearerToken(request)
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const {
      completionId,
      userId,
      taskId,
      reward,
    }: {
      completionId?: string
      userId?: string
      taskId?: string
      reward?: number
    } = await request.json()

    const requestedReward = Number(reward || 0)

    if (!completionId || !userId || !taskId || !Number.isFinite(requestedReward)) {
      return NextResponse.json({ success: false, error: 'Invalid request payload' }, { status: 400 })
    }

    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !authData.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (authData.user.id !== userId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { data: completion, error: completionError } = await supabase
      .from('task_completions')
      .select('id, user_id, task_id, status, reward_given')
      .eq('id', completionId)
      .maybeSingle()

    if (completionError) throw completionError
    if (!completion) {
      return NextResponse.json({ success: false, error: 'Task completion not found' }, { status: 404 })
    }

    if (completion.user_id !== userId || completion.task_id !== taskId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    if (completion.status === 'approved') {
      return NextResponse.json({ success: true, alreadyCompleted: true })
    }

    if (completion.status !== 'pending') {
      return NextResponse.json({ success: false, error: 'Task completion is not pending' }, { status: 409 })
    }

    const { data: existingApproved, error: existingApprovedError } = await supabase
      .from('task_completions')
      .select('id')
      .eq('user_id', userId)
      .eq('task_id', taskId)
      .eq('status', 'approved')
      .neq('id', completionId)
      .limit(1)

    if (existingApprovedError) throw existingApprovedError

    if ((existingApproved || []).length > 0) {
      await supabase
        .from('task_completions')
        .update({ status: 'rejected', reward_given: 0 })
        .eq('id', completionId)
      return NextResponse.json({ success: true, alreadyCompleted: true })
    }

    // Check daily task limit before allowing completion
    const tierName = await getTierName(userId)
    console.log(`[Complete Task] User ${userId}: tier=${tierName}, requestedReward=${requestedReward}`)
    
    const dailyLimit = DAILY_TASK_LIMITS[tierName] || DAILY_TASK_LIMITS.free
    const todayCount = await getTodayTaskCount(userId)

    if (todayCount >= dailyLimit) {
      await supabase
        .from('task_completions')
        .update({ status: 'rejected', reward_given: 0 })
        .eq('id', completionId)
      return NextResponse.json(
        { success: false, error: `Daily task limit of ${dailyLimit} reached` },
        { status: 429 }
      )
    }

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, remaining_budget, is_active, base_reward')
      .eq('id', taskId)
      .maybeSingle()

    if (taskError) throw taskError
    if (!task || task.is_active === false) {
      return NextResponse.json({ success: false, error: 'Task is unavailable' }, { status: 400 })
    }

    // Calculate the correct reward based on user's tier
    const multiplier = TIER_MULTIPLIERS[tierName as keyof typeof TIER_MULTIPLIERS] || TIER_MULTIPLIERS.free
    const correctRewardAmount = Math.round(Number(task.base_reward || 0) * multiplier * 100) / 100
    console.log(`[Complete Task] Task ${taskId}: baseReward=${task.base_reward}, multiplier=${multiplier}, correctAmount=${correctRewardAmount}`)
    
    if (correctRewardAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid reward amount' }, { status: 400 })
    }

    // Use the calculated reward (not the one from frontend to avoid manipulation)
    const rewardToCredit = correctRewardAmount

    const remainingBudget = Number(task.remaining_budget || 0)
    if (remainingBudget < rewardToCredit) {
      await supabase
        .from('task_completions')
        .update({ reward_given: 0, status: 'rejected' })
        .eq('id', completionId)
      return NextResponse.json({ success: false, error: 'Insufficient task budget' }, { status: 409 })
    }

    const nextBudget = Math.max(0, remainingBudget - rewardToCredit)
    const { data: updatedTask, error: updateTaskError } = await supabase
      .from('tasks')
      .update({ remaining_budget: nextBudget })
      .eq('id', taskId)
      .gte('remaining_budget', rewardToCredit)
      .select('id')
      .maybeSingle()

    if (updateTaskError) throw updateTaskError
    if (!updatedTask) {
      await supabase
        .from('task_completions')
        .update({ reward_given: 0, status: 'rejected' })
        .eq('id', completionId)
      return NextResponse.json({ success: false, error: 'Insufficient task budget' }, { status: 409 })
    }

    const { error: completeError } = await supabase
      .from('task_completions')
      .update({ reward_given: rewardToCredit, status: 'approved' })
      .eq('id', completionId)
      .eq('status', 'pending')

    if (completeError) throw completeError

    const { error: creditError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: userId,
        type: 'credit',
        amount: rewardToCredit,
        reference_type: 'task_completion',
        reference_id: completionId,
      })

    if (creditError) throw creditError

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single()

    if (userError) throw userError

    const { error: updateUserError } = await supabase
      .from('users')
      .update({
        balance: Number(user.balance || 0) + rewardToCredit,
      })
      .eq('id', userId)

    if (updateUserError) throw updateUserError

    await creditReferralBonus(userId, rewardToCredit)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error completing task:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to complete task' },
      { status: 500 }
    )
  }
}
