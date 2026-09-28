import supabase from './supabaseClient'
import { getUserTierMultiplier } from './reward'

/**
 * Referral program utilities
 * - Handles referral link generation
 * - Tracks referral rewards
 * - Calculates tier-based bonuses
 * - Manages referral claims
 */

// Referral bonus configuration (percentage of referred user's earnings)
const REFERRAL_BONUSES = {
  free: 0.05,      // 5%
  pro: 0.10,       // 10%
  pro_max: 0.20,   // 20%
}

/**
 * Generate a referral link for a user
 * @param userId - The referrer's user ID
 * @returns Referral URL
 */
export function generateReferralLink(userId: string): string {
  return `https://fast-earn.vercel.app/?ref=${userId}`
}

/**
 * Track a user signup via referral link
 * Creates a referral record when a new user signs up with a ref code
 * @param referrerId - The referrer's user ID
 * @param referredUserId - The newly registered user's ID
 * @returns Success result
 */
export async function trackReferralSignup(
  referrerId: string,
  referredUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if referral already exists
    const { data: existing, error: existingError } = await supabase
      .from('referrals')
      .select('id')
      .eq('referrer_id', referrerId)
      .eq('referred_user_id', referredUserId)
      .single()

    if (existing) {
      return { success: false, error: 'Referral already tracked' }
    }

    // Create referral entry
    const { error: insertError } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrerId,
        referred_user_id: referredUserId,
        reward: 0, // Will be calculated on first task completion
        reward_tier_bonus: 0,
        is_claimed: false,
        reference_type: 'referral_signup',
      })

    if (insertError) throw insertError

    return { success: true }
  } catch (error) {
    console.error('Error tracking referral signup:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Calculate referral bonus when referred user completes a task
 * Uses the referred user's tier to determine bonus percentage
 * @param referredUserId - The referred user's ID
 * @param taskReward - The reward amount from the task
 * @returns Bonus amount to award
 */
export async function calculateReferralBonus(
  referredUserId: string,
  taskReward: number
): Promise<number> {
  try {
    // Get referred user's tier using multiplier function
    // This fetches from subscriptions table and reflects actual tier
    const multiplier = await getUserTierMultiplier(referredUserId)
    
    // Map multiplier back to tier for referral bonus percentage
    // Depends on subscription.tier_id being up-to-date
    // pro = 2.0x → 10% bonus
    // pro_max = 3.0x → 20% bonus
    // free = 1.0x → 5% bonus
    let bonusPercentage = 0.05  // free tier default
    if (multiplier >= 3.0) {
      bonusPercentage = 0.20    // pro_max: 20%
    } else if (multiplier >= 1.5) {
      bonusPercentage = 0.10    // pro: 10%
    }

    const bonusAmount = Math.round(taskReward * bonusPercentage * 100) / 100
    console.log(`[Referral Bonus] User ${referredUserId}: multiplier=${multiplier}, bonusPercent=${bonusPercentage * 100}%, bonus=+${bonusAmount} RWF`)
    return bonusAmount
  } catch (error) {
    console.error('Error calculating referral bonus:', error)
    return 0
  }
}

/**
 * Credit referrer with bonus when referred user earns
 * @param referrerId - The referrer's user ID
 * @param referredUserId - The referred user's ID
 * @param bonus - The bonus amount to award
 * @returns Success result
 */
export async function creditReferralBonus(
  referrerId: string,
  referredUserId: string,
  bonus: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get referral record
    const { data: referral, error: refError } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', referrerId)
      .eq('referred_user_id', referredUserId)
      .single()

    if (refError || !referral) {
      return { success: false, error: 'Referral not found' }
    }

    const newReward = (referral.reward || 0) + bonus

    // Update referral record
    const { error: updateError } = await supabase
      .from('referrals')
      .update({
        reward: newReward,
      })
      .eq('id', referral.id)

    if (updateError) throw updateError

    // Get referrer's current balance
    const { data: referrer, error: getError } = await supabase
      .from('users')
      .select('balance, referral_earnings')
      .eq('id', referrerId)
      .single()

    if (getError) throw getError

    // Update referrer's balance and referral earnings
    const { error: creditError } = await supabase
      .from('users')
      .update({
        balance: (referrer.balance || 0) + bonus,
        referral_earnings: (referrer.referral_earnings || 0) + bonus,
      })
      .eq('id', referrerId)

    if (creditError) throw creditError

    // Log transaction for audit trail
    const { error: transError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: referrerId,
        type: 'credit',
        amount: bonus,
        reference_type: 'referral_bonus',
        reference_id: referral.id,
      })

    if (transError) throw transError

    return { success: true }
  } catch (error) {
    console.error('Error crediting referral bonus:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Get all referrals for a user (as referrer)
 * @param referrerId - The referrer's user ID
 * @returns List of referrals with referred user details
 */
export async function getReferralsByReferrer(referrerId: string) {
  try {
    const { data, error } = await supabase
      .from('referrals')
      .select(
        `
        *,
        referred_user:referred_user_id(id, email, full_name, created_at)
      `
      )
      .eq('referrer_id', referrerId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching referrals:', error)
    return []
  }
}

/**
 * Get referral statistics for a user
 * @param userId - The user ID (as referrer)
 * @returns Statistics including total referrals, earned, pending
 */
export async function getReferralStats(userId: string) {
  try {
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', userId)

    if (error) throw error

    const referrals = data || []
    const totalReferrals = referrals.length
    const claimedRewards = referrals
      .filter((r) => r.is_claimed)
      .reduce((sum, r) => sum + (r.reward || 0), 0)
    const pendingRewards = referrals
      .filter((r) => !r.is_claimed)
      .reduce((sum, r) => sum + (r.reward || 0), 0)

    return {
      totalReferrals,
      claimedRewards,
      pendingRewards,
      totalEarned: claimedRewards + pendingRewards,
    }
  } catch (error) {
    console.error('Error fetching referral stats:', error)
    return {
      totalReferrals: 0,
      claimedRewards: 0,
      pendingRewards: 0,
      totalEarned: 0,
    }
  }
}

/**
 * Get who referred a user
 * @param userId - The user ID
 * @returns Referrer details or null
 */
export async function getReferrer(userId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('referred_by')
      .eq('id', userId)
      .single()

    if (error || !data?.referred_by) return null

    const { data: referrer, error: refError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('id', data.referred_by)
      .single()

    if (refError) throw refError
    return referrer
  } catch (error) {
    console.error('Error fetching referrer:', error)
    return null
  }
}

/**
 * Set referred_by on user record (during signup)
 * @param userId - The new user's ID
 * @param referrerId - The referrer's ID
 * @returns Success result
 */
export async function setUserReferrer(
  userId: string,
  referrerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ referred_by: referrerId })
      .eq('id', userId)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Error setting user referrer:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Claim/finalize referral rewards
 * Admin-only: marks referral as claimed so bonus can't be paid twice
 * @param referralId - The referral record ID
 * @returns Success result
 */
export async function claimReferralReward(
  referralId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('referrals')
      .update({
        is_claimed: true,
        claimed_at: new Date().toISOString(),
      })
      .eq('id', referralId)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Error claiming referral reward:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Get top referrers for the leaderboard
 * @param limit - Number of top users to fetch (default 20)
 * @returns Array of top referrers with counts
 */
export async function getReferralLeaderboard(limit = 20) {
  try {
    const { data, error } = await supabase.rpc('get_top_referrers', { limit_count: limit })
    
    if (error) throw error
    return data as { user_id: string; full_name: string; referral_count: number }[]
  } catch (error) {
    console.error('Error fetching referral leaderboard:', JSON.stringify(error, null, 2))
    return []
  }
}
