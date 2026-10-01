import supabase from './supabaseClient'

/**
 * Referral program utilities
 * - Handles referral link generation
 * - Reads signup referral rewards
 */

/**
 * Generate a referral link for a user
 * @param userId - The referrer's user ID
 * @returns Referral URL
 */
export function generateReferralLink(userId: string): string {
  return `https://fast-earn.vercel.app/?ref=${userId}`
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
