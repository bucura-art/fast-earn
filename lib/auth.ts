import supabase from './supabaseClient'
import { User } from './types'

function phoneToAuthEmail(phone: string) {
  const normalizedPhone = phone.replace(/\D/g, '')
  if (!normalizedPhone) throw new Error('Enter a valid phone number')
  return `${normalizedPhone}@fast.com`
}

// Register new user with Supabase Auth + user profile
export async function registerUser(
  phone: string,
  password: string,
  fullName: string,
  tier: string = 'free',
  ipAddress?: string,
  deviceFingerprint?: string,
  referralCode?: string
) {
  try {
    const email = phoneToAuthEmail(phone)

    // Sign up with Supabase Auth (include full_name in user metadata so triggers can use it)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone: phone.trim() } },
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('User registration failed')

    // Resolve tier id (tiers table stores UUIDs) — fall back to null
    let tierId: string | null = null
    try {
      const { data: tierRow } = await supabase.from('tiers').select('id').eq('name', tier).maybeSingle()
      // @ts-ignore
      tierId = tierRow?.id ?? null
    } catch (e) {
      tierId = null
    }
    // Ensure we have at least a 'free' tier id as fallback
    if (!tierId) {
      try {
        const { data: defaultTier } = await supabase.from('tiers').select('id').eq('name', 'free').maybeSingle()
        // @ts-ignore
        tierId = defaultTier?.id ?? null
      } catch (e) {
        tierId = null
      }
    }

    // Create or update user profile in users table (handle case where trigger already inserted)
    const profilePayload = {
      id: authData.user.id,
      email,
      full_name: fullName,
      phone: phone.trim(),
      tier_id: tierId,
      balance: 0,
      total_earned: 0,
      referral_earnings: 0,
      referred_by: referralCode || null,
      is_verified: false,
      is_suspended: false,
      ip_addresses: ipAddress ? [ipAddress] : [],
      device_fingerprints: deviceFingerprint ? [deviceFingerprint] : [],
      last_login: new Date().toISOString(),
    }

    let profileError = null
    try {
      const insertRes = await supabase.from('users').insert(profilePayload)
      profileError = insertRes.error
      // If insert failed due to duplicate primary key (trigger already created row), update instead
      if (profileError) {
        await supabase.from('users').update({ full_name: fullName, email, phone: phone.trim(), tier_id: tierId, ip_addresses: ipAddress ? [ipAddress] : undefined, device_fingerprints: deviceFingerprint ? [deviceFingerprint] : undefined, last_login: new Date().toISOString() }).eq('id', authData.user.id)
      }
    } catch (e) {
      // attempt update as fallback
      await supabase.from('users').update({ full_name: fullName, email, phone: phone.trim(), tier_id: tierId, ip_addresses: ipAddress ? [ipAddress] : undefined, device_fingerprints: deviceFingerprint ? [deviceFingerprint] : undefined, last_login: new Date().toISOString() }).eq('id', authData.user.id)
    }

    // Create initial subscription
    // Create initial subscription (use resolved tier id if available)
    const { error: subError } = await supabase.from('subscriptions').insert({
      user_id: authData.user.id,
      tier_id: tierId,
      status: 'active',
    })

    if (subError) throw subError

    // Track referral if referral code provided
    if (referralCode) {
      try {
        const { trackReferralSignup } = await import('./referral')
        await trackReferralSignup(referralCode, authData.user.id)
      } catch (e) {
        console.warn('Error tracking referral:', e)
        // Non-fatal: continue with signup even if referral tracking fails
      }
    }

    // Attempt to sign the user in immediately after signup so they have a session
    try {
      await supabase.auth.signInWithPassword({ email, password })
    } catch (e) {
      // non-fatal; user can still log in manually
    }

    return { user: authData.user, success: true }
  } catch (error) {
    console.error('Registration error:', error)
    throw error
  }
}

// Login user
export async function loginUser(phone: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: phoneToAuthEmail(phone),
      password,
    })

    if (error) throw error
    return { user: data.user, session: data.session, success: true }
  } catch (error) {
    console.error('Login error:', error)
    throw error
  }
}

// Get current session
export async function getCurrentSession() {
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data.session
  } catch (error) {
    console.error('Session error:', error)
    return null
  }
}

// Get current user with profile
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: authUser, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser.user) return null

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.user.id)
      .single()

    if (profileError) return null

    return profile
  } catch (error) {
    console.error('Get user error:', error)
    return null
  }
}

// Logout
export async function logout() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Logout error:', error)
    throw error
  }
}

// Update user profile
export async function updateUserProfile(
  userId: string,
  updates: Partial<User>
) {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Update profile error:', error)
    throw error
  }
}
