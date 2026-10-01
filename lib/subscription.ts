import { supabase } from './supabaseClient'
import { UserTier } from './types'

/**
 * Get user subscription and upgrade if needed
 * @param userId - User ID
 * @param newTier - New tier to upgrade to
 */
export async function getAndUpgradeSubscription(userId: string, newTier: UserTier) {
  if (!userId) throw new Error('User ID is required')
  if (!newTier) throw new Error('Tier is required')

  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      tier: newTier,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error upgrading subscription:', error)
    throw new Error(error.message || 'Failed to upgrade subscription')
  }

  // Also update the user tier field
  const { error: userError } = await supabase
    .from('users')
    .update({ tier: newTier })
    .eq('id', userId)

  if (userError) {
    console.error('Error updating user tier:', userError)
    throw new Error(userError.message || 'Failed to update user tier')
  }

  return data
}

/**
 * Get user subscription details with tier information
 * @param userId - User ID
 */
export async function getUserSubscription(userId: string) {
  if (!userId) throw new Error('User ID is required')

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, tier:tier_id(name)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching subscription:', error)
    throw new Error(error.message || 'Failed to fetch subscription')
  }

  return data || null
}

/**
 * Get tier features
 * @param tier - User tier
 */
export function getTierFeatures(tier: UserTier) {
  const features: Record<UserTier, string[]> = {
    free: [
      'Watch video tasks',
      'Basic rewards',
      'Mobile Money withdrawal',
      'Task limit: 5 per day',
    ],
    pro: [
      'Everything in Free',
      'Withdrawal limit: 500,000 RWF',
      'Priority support',
      'Task limit: 10 per day',
    ],
    pro_max: [
      'Everything in Pro',
      'Withdrawal limit: unlimited',
      'Exclusive high-value tasks',
      'VIP support',
      'Task limit: 20 per day',
    ],
  }
  return features[tier] || features.free
}

/**
 * Get daily task limit for tier
 * @param tier - User tier
 */
export function getDailyTaskLimit(tier: UserTier): number {
  const limits: Record<UserTier, number> = {
    free: 5,
    pro: 10,
    pro_max: 20,
  }
  return limits[tier] || 5
}

/**
 * Get withdrawal limit for tier
 * @param tier - User tier
 */
export function getWithdrawalLimit(tier: UserTier): number {
  const limits: Record<UserTier, number> = {
    free: 100000, // 100,000 RWF
    pro: 500000, // 500,000 RWF
    pro_max: Infinity, // Unlimited
  }
  return limits[tier] || 100000
}

/**
 * Extract tier name from subscription object
 * Handles both array and object formats from Supabase responses
 * @param subscription - Subscription object with tier data
 * @returns Tier name or 'free' as default
 */
export function getTierNameFromSubscription(subscription: any): UserTier {
  if (!subscription) return 'free'
  
  const tierData = subscription?.tier
  const tierName = (Array.isArray(tierData) ? tierData[0]?.name : tierData?.name) || 'free'
  
  return (tierName as UserTier) || 'free'
}

/**
 * Check if subscription has expired and downgrade user if needed
 * @param subscription - Subscription object with end_date
 * @param userId - User ID for downgrade
 * @returns true if subscription is still active, false if expired
 */
export async function checkAndHandleSubscriptionExpiry(
  subscription: any,
  userId: string
): Promise<boolean> {
  if (!subscription) return false

  const endDate = subscription?.end_date ? new Date(subscription.end_date) : null
  if (!endDate) return true // No end date = infinite subscription

  const now = new Date()
  if (now < endDate) return true // Still valid

  // Subscription has expired - downgrade to free
  console.log(`[Subscription Expired] User ${userId}: expired on ${endDate.toISOString()}`)

  try {
    // Get free tier ID
    const { data: freeTier, error: tierError } = await supabase
      .from('tiers')
      .select('id')
      .eq('name', 'free')
      .single()

    if (tierError) throw tierError

    // Update user tier
    const { error: userError } = await supabase
      .from('users')
      .update({ tier_id: freeTier.id })
      .eq('id', userId)

    if (userError) throw userError

    // Mark subscription as expired
    const { error: subError } = await supabase
      .from('subscriptions')
      .update({ status: 'expired' })
      .eq('id', subscription.id)

    if (subError) throw subError

    console.log(`[Subscription Downgraded] User ${userId}: downgraded to free tier`)
    return false
  } catch (error) {
    console.error('Error handling subscription expiry:', error)
    return false
  }
}
