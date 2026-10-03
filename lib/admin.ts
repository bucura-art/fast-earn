import { supabase } from './supabaseClient'
import { User } from './types'

/**
 * Check if user is admin
 * @param userId - User ID
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  if (!userId) return false

  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error checking admin status:', error)
      return false
    }

    return data?.role === 'admin'
  } catch (error) {
    console.error('Admin check error:', error)
    return false
  }
}

/**
 * Log admin activity for audit trail
 * @param adminId - Admin user ID
 * @param action - Action performed
 * @param targetType - Type of target (user, task, withdrawal, etc.)
 * @param targetId - ID of target entity
 * @param changes - Object with changes made
 */
export async function logAdminActivity(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  changes?: Record<string, unknown>
) {
  try {
    const { error } = await supabase.from('admin_activities').insert({
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
      changes: changes || null,
      created_at: new Date().toISOString(),
    })

    if (error) throw error
  } catch (error) {
    console.error('Error logging admin activity:', error)
  }
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats() {
  try {
    const { data: totalUsers } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })

    const { data: activeUsers } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('is_suspended', false)

    const { data: totalEarned } = await supabase
      .from('wallet_transactions')
      .select('amount')
      .eq('type', 'credit')

    const { data: totalWithdrawn } = await supabase
      .from('withdrawals')
      .select('amount')
      .eq('status', 'approved')

    const { data: activeTasks } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)

    const totalDistributed = (totalEarned || []).reduce((sum: number, t: Record<string, unknown>) => sum + ((t.amount as number) || 0), 0)
    const totalPayouts = (totalWithdrawn || []).reduce((sum: number, w: Record<string, unknown>) => sum + ((w.amount as number) || 0), 0)

    return {
      totalUsers: totalUsers?.length || 0,
      activeUsers: activeUsers?.length || 0,
      totalDistributed,
      totalPayouts,
      activeTasks: activeTasks?.length || 0,
    }
  } catch (error) {
    console.error('Error getting dashboard stats:', error)
    return {
      totalUsers: 0,
      activeUsers: 0,
      totalDistributed: 0,
      totalPayouts: 0,
      activeTasks: 0,
    }
  }
}

/**
 * Get all users with optional filtering
 */
export async function getAllUsers(
  limit: number = 50,
  offset: number = 0,
  filter?: {
    role?: string
    is_suspended?: boolean
    is_verified?: boolean
    tier?: string
    is_flagged?: boolean
    sort?: 'balance_desc' | 'newest' | 'oldest'
  }
) {
  try {
    const select = filter?.is_flagged === undefined ? '*' : '*, fraud_logs!left(id)'
    let query = supabase.from('users').select(select, { count: 'exact' })

    if (filter?.role) query = query.eq('role', filter.role)
    if (filter?.is_suspended !== undefined) query = query.eq('is_suspended', filter.is_suspended)
    if (filter?.is_verified !== undefined) query = query.eq('is_verified', filter.is_verified)
    if (filter?.tier) query = query.eq('tier', filter.tier)
    if (filter?.is_flagged === true) query = query.not('fraud_logs.id', 'is', null)
    if (filter?.is_flagged === false) query = query.is('fraud_logs.id', null)

    if (filter?.sort === 'balance_desc') query = query.order('balance', { ascending: false })
    if (filter?.sort === 'newest') query = query.order('created_at', { ascending: false })
    if (filter?.sort === 'oldest') query = query.order('created_at', { ascending: true })

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throw error

    return { users: data || [], total: count || 0 }
  } catch (error) {
    console.error('Error fetching users:', error)
    return { users: [], total: 0 }
  }
}

/**
 * Suspend or unsuspend user
 */
export async function toggleUserSuspension(userId: string, suspend: boolean, adminId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ is_suspended: suspend })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error

    await logAdminActivity(adminId, suspend ? 'suspend_user' : 'unsuspend_user', 'user', userId, {
      is_suspended: suspend,
    })

    return data
  } catch (error) {
    console.error('Error toggling user suspension:', error)
    throw error
  }
}

/**
 * Verify user
 */
export async function verifyUser(userId: string, adminId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ is_verified: true })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error

    await logAdminActivity(adminId, 'verify_user', 'user', userId, { is_verified: true })

    return data
  } catch (error) {
    console.error('Error verifying user:', error)
    throw error
  }
}

/**
 * Reset user balance to half of current balance
 * Useful when fraud is detected after verification.
 */
export async function resetUserBalanceToHalf(userId: string, adminId: string) {
  try {
    const { data: user, error: getError } = await supabase
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single()

    if (getError) throw getError

    const currentBalance = Number(user?.balance || 0)
    const newBalance = Math.round((currentBalance / 2) * 100) / 100
    const deductedAmount = Math.max(0, currentBalance - newBalance)

    const { data, error } = await supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error

    if (deductedAmount > 0) {
      const { error: txError } = await supabase.from('wallet_transactions').insert({
        user_id: userId,
        type: 'debit',
        amount: deductedAmount,
        reference_type: 'admin_balance_reset',
        reference_id: userId,
        created_at: new Date().toISOString(),
      })

      if (txError) {
        console.error('Error logging balance reset transaction:', txError)
      }
    }

    await logAdminActivity(adminId, 'reset_user_balance_half', 'user', userId, {
      previous_balance: currentBalance,
      new_balance: newBalance,
      deducted_amount: deductedAmount,
    })

    return data
  } catch (error) {
    console.error('Error resetting user balance:', error)
    throw error
  }
}

/**
 * Log fraud activity
 */
export async function logFraud(
  userId: string,
  fraudType: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  description: string,
  actionTaken?: string
) {
  try {
    const { error } = await supabase.from('fraud_logs').insert({
      user_id: userId,
      fraud_type: fraudType,
      severity,
      description,
      action_taken: actionTaken || null,
      created_at: new Date().toISOString(),
    })

    if (error) throw error

    // Auto-suspend on critical fraud
    if (severity === 'critical') {
      await supabase.from('users').update({ is_suspended: true }).eq('id', userId)
    }
  } catch (error) {
    console.error('Error logging fraud:', error)
    throw error
  }
}

/**
 * Get fraud logs
 */
export async function getFraudLogs(limit: number = 50, offset: number = 0) {
  try {
    const { data, error, count } = await supabase
      .from('fraud_logs')
      .select('*, users(email, full_name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return { logs: data || [], total: count || 0 }
  } catch (error) {
    console.error('Error fetching fraud logs:', error)
    return { logs: [], total: 0 }
  }
}

/**
 * Get all tasks with optional filtering
 */
export async function getAllTasks(
  limit: number = 50,
  offset: number = 0,
  filter?: { category?: string; is_active?: boolean }
) {
  try {
    let query = supabase
      .from('tasks')
      .select('*, created_by(full_name, email)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (filter?.category) query = query.eq('category', filter.category)
    if (filter?.is_active !== undefined) query = query.eq('is_active', filter.is_active)

    const { data, error, count } = await query

    if (error) throw error

    return { tasks: data || [], total: count || 0 }
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return { tasks: [], total: 0 }
  }
}

/**
 * Update task
 */
export async function updateTask(taskId: string, updates: Record<string, unknown>, adminId: string) {
  try {
    const { data, error } = await supabase.from('tasks').update(updates).eq('id', taskId).select().single()

    if (error) throw error

    await logAdminActivity(adminId, 'update_task', 'task', taskId, updates)

    return data
  } catch (error) {
    console.error('Error updating task:', error)
    throw error
  }
}

/**
 * Deactivate task
 */
export async function deactivateTask(taskId: string, adminId: string) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .update({ is_active: false })
      .eq('id', taskId)
      .select()
      .single()

    if (error) throw error

    await logAdminActivity(adminId, 'deactivate_task', 'task', taskId, { is_active: false })

    return data
  } catch (error) {
    console.error('Error deactivating task:', error)
    throw error
  }
}

/**
 * Get all withdrawals with optional filtering
 */
export async function getAllWithdrawals(
  limit: number = 50,
  offset: number = 0,
  filter?: { status?: string; method?: string }
) {
  try {
    let query = supabase
      .from('withdrawals')
      .select('*, users(email, full_name, phone)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (filter?.status) query = query.eq('status', filter.status)
    if (filter?.method) query = query.eq('method', filter.method)

    const { data, error, count } = await query

    if (error) throw error

    return { withdrawals: data || [], total: count || 0 }
  } catch (error) {
    console.error('Error fetching withdrawals:', error)
    return { withdrawals: [], total: 0 }
  }
}

/**
 * Approve withdrawal
 */
export async function approveWithdrawal(withdrawalId: string, adminId: string, notes?: string) {
  try {
    const { data, error } = await supabase
      .from('withdrawals')
      .update({
        status: 'approved',
        reviewed_by: adminId,
        review_notes: notes || null,
        processed_at: new Date().toISOString(),
      })
      .eq('id', withdrawalId)
      .select()
      .single()

    if (error) throw error

    await logAdminActivity(adminId, 'approve_withdrawal', 'withdrawal', withdrawalId, { notes })

    return data
  } catch (error) {
    console.error('Error approving withdrawal:', error)
    throw error
  }
}

/**
 * Reject withdrawal
 */
export async function rejectWithdrawal(withdrawalId: string, adminId: string, reason: string) {
  try {
    // Get withdrawal details to refund balance
    const { data: withdrawal, error: getError } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('id', withdrawalId)
      .single()

    if (getError) throw getError

    // Update withdrawal status
    const { data, error } = await supabase
      .from('withdrawals')
      .update({
        status: 'rejected',
        reviewed_by: adminId,
        review_notes: reason,
        processed_at: new Date().toISOString(),
      })
      .eq('id', withdrawalId)
      .select()
      .single()

    if (error) throw error

    // Refund the balance
    await supabase.from('wallet_transactions').insert({
      user_id: withdrawal.user_id,
      type: 'credit',
      amount: withdrawal.amount,
      reference_type: 'withdrawal_rejection',
      reference_id: withdrawalId,
      created_at: new Date().toISOString(),
    })

    await logAdminActivity(adminId, 'reject_withdrawal', 'withdrawal', withdrawalId, { reason })

    return data
  } catch (error) {
    console.error('Error rejecting withdrawal:', error)
    throw error
  }
}

/**
 * Get all subscriptions
 */
export async function getAllSubscriptions(
  limit: number = 50,
  offset: number = 0,
  filter?: { excludeFree?: boolean }
) {
  try {
    const tiersRelationship = filter?.excludeFree ? 'tiers!inner(name)' : 'tiers(name)'
    let query = supabase
      .from('subscriptions')
      .select(`*, users(email, full_name), ${tiersRelationship}`, { count: 'exact' })
      .order('created_at', { ascending: false })

    if (filter?.excludeFree) query = query.neq('tiers.name', 'free')

    const { data, error, count } = await query.range(offset, offset + limit - 1)

    if (error) throw error

    return { subscriptions: data || [], total: count || 0 }
  } catch (error) {
    console.error('Error fetching subscriptions:', error)
    return { subscriptions: [], total: 0 }
  }
}

/**
 * Get system statistics for trends
 */
export async function getSystemStats() {
  try {
    // Get daily active users
    const { data: recentUsers } = await supabase
      .from('users')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    // Get recent transactions volume
    const { data: recentTransactions } = await supabase
      .from('wallet_transactions')
      .select('amount, type')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    // Get task completion stats
    const { data: recentCompletions } = await supabase
      .from('task_completions')
      .select('status')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    const approvedCompletions = recentCompletions?.filter((c: Record<string, unknown>) => c.status === 'approved').length || 0
    const totalCompletions = recentCompletions?.length || 0

    const avgApprovalRate = totalCompletions > 0 ? (approvedCompletions / totalCompletions) * 100 : 0

    return {
      newUsersLast30Days: recentUsers?.length || 0,
      totalTransactionsLast30Days: recentTransactions?.reduce((sum: number, t: Record<string, unknown>) => sum + ((t.amount as number) || 0), 0) || 0,
      taskCompletionRate: avgApprovalRate.toFixed(2),
    }
  } catch (error) {
    console.error('Error getting system stats:', error)
    return {
      newUsersLast30Days: 0,
      totalTransactionsLast30Days: 0,
      taskCompletionRate: '0',
    }
  }
}
