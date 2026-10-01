import supabase from './supabaseClient'
import { Task, TaskCompletion } from './types'

// Get available tasks for user
export async function getAvailableTasks(
  userId?: string,
  category?: string
): Promise<Task[]> {
  try {
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('is_active', true)
      .gt('remaining_budget', 0)
      .order('created_at', { ascending: false })

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Get tasks error:', error)
    return []
  }
}

// Get single task
export async function getTask(taskId: string): Promise<Task | null> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Get task error:', error)
    return null
  }
}

// Record task completion (start)
export async function startTask(
  userId: string,
  taskId: string,
  ipAddress: string,
  deviceFingerprint?: string
): Promise<TaskCompletion | null> {
  try {
    // Prevent duplicate attempts for the same task.
    const { data: existing, error: existingError } = await supabase
      .from('task_completions')
      .select('*')
      .eq('user_id', userId)
      .eq('task_id', taskId)
      .in('status', ['pending', 'approved'])
      .order('created_at', { ascending: false })
      .limit(1)

    if (existingError) throw existingError

    const latestExisting = existing?.[0]
    if (latestExisting) {
      // Approved means already completed; pending means resume same attempt.
      if (latestExisting.status === 'approved') return null
      return latestExisting as TaskCompletion
    }

    const { data, error } = await supabase
      .from('task_completions')
      .insert({
        user_id: userId,
        task_id: taskId,
        reward_given: 0,
        status: 'pending',
        ip_address: ipAddress,
        device_fingerprint: deviceFingerprint || null,
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Start task error:', error)
    return null
  }
}

// Complete task with reward
export async function completeTask(
  completionId: string,
  userId: string,
  taskId: string
): Promise<boolean> {
  try {
    if (!completionId || !userId || !taskId) {
      return false
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData?.session?.access_token
    if (!accessToken) {
      console.error('Complete task error: missing auth session')
      return false
    }

    const response = await fetch('/api/complete-task', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        completionId,
        userId,
        taskId,
      }),
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok || !payload?.success) {
      console.error('Complete task API error:', payload?.error || response.statusText)
      return false
    }

    return true
  } catch (error) {
    console.error('Complete task error:', error)
    return false
  }
}

// Get user's task completions
export async function getUserTaskCompletions(
  userId: string,
  limit: number = 50
): Promise<TaskCompletion[]> {
  try {
    const { data, error } = await supabase
      .from('task_completions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Get task completions error:', error)
    return []
  }
}

// Get today's task count for a user
export async function getTodayTaskCount(userId: string): Promise<number> {
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
