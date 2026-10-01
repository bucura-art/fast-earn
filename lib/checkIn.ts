import supabase from './supabaseClient'

interface CheckInStatus {
  checkedIn: boolean
}

interface CheckInResult extends CheckInStatus {
  alreadyCheckedIn: boolean
  reward: number
  balance?: number
}

async function requestCheckIn<T>(method: 'GET' | 'POST'): Promise<T> {
  const { data, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError

  const accessToken = data.session?.access_token
  if (!accessToken) throw new Error('You must be signed in to check in.')

  const response = await fetch('/api/check-in', {
    method,
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const payload = await response.json().catch(() => null)

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || 'Unable to process check-in.')
  }

  return payload as T
}

export function getCheckInStatus(): Promise<CheckInStatus> {
  return requestCheckIn<CheckInStatus>('GET')
}

export function submitCheckIn(): Promise<CheckInResult> {
  return requestCheckIn<CheckInResult>('POST')
}
