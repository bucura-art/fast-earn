// Core types for the Fast Earn system

export type UserTier = 'free' | 'pro' | 'pro_max'
export type UserRole = 'user' | 'admin'

export interface User {
  id: string
  email: string
  full_name: string
  phone?: string
  balance: number
  referral_earnings: number
  referred_by?: string
  tier_id: string
  tier: UserTier
  role: UserRole
  is_verified: boolean
  is_suspended: boolean
  ip_addresses?: string[]
  device_fingerprints?: string[]
  last_login?: string
  failed_login_attempts?: number
  created_at: string
}

export interface Task {
  id: string
  title: string
  description: string
  category: 'video' | 'click' | 'follow' | 'subscribe' | 'install'
  base_reward: number
  total_budget: number
  remaining_budget: number
  completion_count?: number
  is_active: boolean
  video_url?: string
  external_url?: string
  min_watch_seconds?: number
  action_url?: string
  created_at: string
}

export interface TaskCompletion {
  id: string
  user_id: string
  task_id: string
  reward_given: number
  status: 'pending' | 'approved' | 'rejected'
  ip_address: string
  device_fingerprint?: string
  proof_url?: string
  created_at: string
}

export interface WalletTransaction {
  id: string
  user_id: string
  type: 'credit' | 'debit'
  amount: number
  reference_type: string
  reference_id?: string
  created_at: string
}

export interface Withdrawal {
  id: string
  user_id: string
  amount: number
  method: string
  status: 'pending' | 'approved' | 'rejected'
  processed_at?: string
  created_at: string
}

export interface Subscription {
  id: string
  user_id: string
  tier_id: string
  tier: UserTier
  start_date: string
  end_date: string
  status: 'active' | 'expired'
  created_at: string
}

export interface Referral {
  id: string
  referrer_id: string
  referred_user_id: string
  reward: number
  reward_tier_bonus: number
  is_claimed: boolean
  claimed_at?: string
  reference_type: string
  notes?: string
  created_at: string
}
