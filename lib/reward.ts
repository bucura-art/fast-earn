import supabase from './supabaseClient'
import { TIER_MULTIPLIERS } from './tierUtils'

/**
 * Reward calculation and wallet management
 * - Never calculate rewards in frontend
 * - Use transactions when crediting wallet
 * - Log every financial action
 */

// Get user's tier multiplier
export async function getUserTierMultiplier(userId: string): Promise<number> {
  try {
    // Try to get from active subscription first
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('tier:tier_id(name, reward_multiplier)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()

    if (subscription?.tier) {
      const tier = Array.isArray(subscription.tier) ? subscription.tier[0] : subscription.tier
      if (tier?.name) {
        return TIER_MULTIPLIERS[tier.name as keyof typeof TIER_MULTIPLIERS] || 1.0
      }
    }

    // Fallback: Check user profile directly
    const { data: user } = await supabase.from('users').select('tier:tier_id(name)').eq('id', userId).maybeSingle()

    if (user?.tier) {
      const tier = Array.isArray(user.tier) ? user.tier[0] : user.tier
      if (tier?.name) {
        return TIER_MULTIPLIERS[tier.name as keyof typeof TIER_MULTIPLIERS] || 1.0
      }
    }

    return 1.0
  } catch (error) {
    console.error('Get tier multiplier error:', error)
    return 1.0
  }
}

// Calculate reward based on base reward and tier
export async function calculateTaskReward(
  userId: string,
  baseReward: number
): Promise<number> {
  const multiplier = await getUserTierMultiplier(userId)
  return Math.round(baseReward * multiplier * 100) / 100
}

// Credit wallet after task completion
export async function creditWallet(
  userId: string,
  amount: number,
  referenceType: string,
  referenceId: string
) {
  try {
    // Record transaction
    const { error: transError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: userId,
        type: 'credit',
        amount,
        reference_type: referenceType,
        reference_id: referenceId,
      })

    if (transError) throw transError

    // Update user balance
    const { data: user, error: getError } = await supabase
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single()

    if (getError) throw getError

    const { error: updateError } = await supabase
      .from('users')
      .update({
        balance: (user.balance || 0) + amount,
      })
      .eq('id', userId)

    if (updateError) throw updateError

    return { success: true }
  } catch (error) {
    console.error('Credit wallet error:', error)
    throw error
  }
}

// Debit wallet for withdrawal
export async function debitWallet(userId: string, amount: number) {
  try {
    const { data: user, error: getError } = await supabase
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single()

    if (getError) throw getError
    if ((user.balance || 0) < amount) throw new Error('Insufficient balance')

    // Record transaction
    const { error: transError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: userId,
        type: 'debit',
        amount,
        reference_type: 'withdrawal',
      })

    if (transError) throw transError

    // Update user balance
    const { error: updateError } = await supabase
      .from('users')
      .update({
        balance: (user.balance || 0) - amount,
      })
      .eq('id', userId)

    if (updateError) throw updateError

    return { success: true }
  } catch (error) {
    console.error('Debit wallet error:', error)
    throw error
  }
}

// Get user balance
export async function getBalance(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single()

    if (error) throw error
    return data?.balance || 0
  } catch (error) {
    console.error('Get balance error:', error)
    return 0
  }
}

// Get wallet transactions
export async function getWalletTransactions(
  userId: string,
  limit: number = 50
) {
  try {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Get transactions error:', error)
    return []
  }
}
