import supabase from './supabaseClient'

/**
 * Reward calculation and wallet management
 * Task completion amounts are determined by the task's base reward on the server.
 */

// Task rewards are set per task and do not vary by user tier.
export function calculateTaskReward(baseReward: number): number {
  return Math.round(baseReward * 100) / 100
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
