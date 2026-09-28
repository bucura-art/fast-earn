# Referral Program Implementation Analysis

## Overview
The referral program is a two-tier system where users can earn bonuses when they refer friends who then complete tasks. The bonus amount depends on the referred user's subscription tier.

---

## 1. Database Schema

### Primary Tables Involved

#### `users` Table
```sql
referral_earnings NUMERIC DEFAULT 0      -- Total earned through referrals
referred_by UUID REFERENCES users(id)    -- Who referred this user
```

#### `referrals` Table
```sql
id UUID PRIMARY KEY
referrer_id UUID NOT NULL                -- User earning the bonus
referred_user_id UUID NOT NULL           -- User who was referred
reward NUMERIC DEFAULT 0                 -- Total bonus earned (accumulates)
reward_tier_bonus NUMERIC DEFAULT 0      -- Unused field (legacy)
is_claimed BOOLEAN DEFAULT FALSE         -- Unused: always false
claimed_at TIMESTAMP                     -- Unused: always NULL
reference_type TEXT DEFAULT 'referral_signup'
UNIQUE(referrer_id, referred_user_id)    -- One referral per pair
```

#### `wallet_transactions` Table
```sql
reference_type: 'referral_bonus'
reference_id: referral.id                -- Links transaction to referral record
```

**Key Observation:** The `is_claimed` and `claimed_at` fields are never used. Bonuses are credited immediately and don't require a claim step.

---

## 2. Core Implementation Files

### [lib/referral.ts](lib/referral.ts) - Referral Utilities
Main file handling referral logic with 7 exported functions:

#### `generateReferralLink(userId: string): string`
- **Purpose:** Create shareable referral URL
- **Output:** `https://fastearn.vercel.app/?ref={userId}`
- **Usage:** Frontend passes this to users to share

#### `trackReferralSignup(referrerId: string, referredUserId: string)`
- **Purpose:** Create referral record when referred user signs up
- **Flow:**
  1. Check if referral already exists (prevent duplicates)
  2. Insert into `referrals` table with `reward: 0`
  3. Logs transaction type as `referral_signup`
- **Caller:** [lib/auth.ts](lib/auth.ts) line 90-91 during user registration

#### `calculateReferralBonus(referredUserId: string, taskReward: number): number`
- **Purpose:** Calculate bonus amount based on referred user's tier
- **Logic:**
  - Fetches referred user's tier multiplier via `getUserTierMultiplier()`
  - Maps multiplier to bonus percentage:
    - ≥3.0 multiplier (pro_max) → 20% bonus
    - ≥1.5 multiplier (pro) → 10% bonus
    - <1.5 multiplier (free) → 5% bonus
  - Returns `Math.round(taskReward * bonusPercentage * 100) / 100`
- **Example:** If referred user (pro_max) earns 1,000 RWF, referrer gets 200 RWF

#### `creditReferralBonus(referrerId: string, referredUserId: string, bonus: number)`
- **Purpose:** Award bonus to referrer when referred user earns
- **Updates:**
  1. `referrals.reward` += bonus
  2. `users.balance` += bonus
  3. `users.referral_earnings` += bonus
  4. Inserts wallet transaction record
- **Called by:** [app/api/complete-task/route.ts](app/api/complete-task/route.ts) line 124
- **Note:** Runs silently - failures logged but don't block task completion

#### `getReferralsByReferrer(referrerId: string)`
- **Purpose:** Fetch all referrals for a user (as referrer)
- **Returns:** Array of referrals with referred user details (email, name, created_at)
- **Usage:** Could be used in admin dashboard

#### `getReferralStats(userId: string): ReferralStats`
- **Purpose:** Get aggregated statistics for a user
- **Returns:**
  ```typescript
  {
    totalReferrals: number           // Total referred users
    claimedRewards: number           // Unused (always 0)
    pendingRewards: number           // Total bonus earned
    totalEarned: number              // Sum of both
  }
  ```
- **Usage:** Not currently used in frontend

#### `getReferrer(userId: string)` & `setUserReferrer(userId: string, referrerId: string)`
- **Purpose:** Link/fetch referrer relationship
- **Usage:** Not currently called in codebase

---

### [app/api/complete-task/route.ts](app/api/complete-task/route.ts) - Bonus Credit Logic

**Inline referral bonus configuration (lines 16-20):**
```typescript
const REFERRAL_BONUS_BY_TIER: Record<string, number> = {
  free: 0.05,        // 5%
  pro: 0.10,         // 10%
  pro_max: 0.20,     // 20%
}
```

**Bonus Flow (lines 124-187):**

1. **Get Referrer:** Query `users.referred_by` to find referrer
2. **Get Tier:** Call `getTierName()` to determine referred user's subscription tier
3. **Calculate Bonus:** `bonusAmount = taskReward * bonusRate`
4. **Fetch Referral Record:** Query `referrals` table by referrer_id + referred_user_id
5. **Update Referral:** Add bonus to cumulative `referrals.reward`
6. **Credit Referrer:** 
   - `balance` += bonus
   - `referral_earnings` += bonus
7. **Log Transaction:** Insert into `wallet_transactions` with type `referral_bonus`

**Error Handling:** Wrapped in try-catch with warning log only - non-blocking

---

### [app/[locale]/auth.ts](lib/auth.ts) - Signup Integration

**Registration flow with referral tracking (lines 90-98):**
```typescript
if (referralCode) {
  try {
    const { trackReferralSignup } = await import('./referral')
    await trackReferralSignup(referralCode, authData.user.id)
  } catch (e) {
    console.warn('Error tracking referral:', e)
    // Non-fatal: continue
  }
}
```

- Extracts `ref` query param from signup URL
- Dynamically imports `trackReferralSignup` to avoid tree-shaking
- Non-fatal errors - signup continues regardless

---

## 3. Frontend Display

### [app/[locale]/dashboard/tasks/page.tsx](app/[locale]/dashboard/tasks/page.tsx)

**Referral Card (lines 493-543):**
- Shows "Referral Program" card on dashboard
- Displays "5-20% Bonus" range
- **Copy Link Button:** Uses [CopyButton](components/CopyButton.tsx) component
- **Upsell:** Shows "Earn 3x with pro max" upgrade prompt for non-premium users
- Uses `userId` to generate link: `https://fast-earn.vercel.app/register?ref=${userId}`

**Notification System:**
```typescript
showNotification('success', 'Copied', 'Referral link copied to clipboard.')
showNotification('error', 'Copy failed', 'Could not copy your referral link.')
```

---

## 4. Bonus Tier Structure

| Tier | Multiplier | Registration Cost | Referral Bonus Rate |
|------|-----------|-------------------|-------------------|
| Free | 1.0x | 0 RWF | 5% |
| Pro | 2.0x | 6,000 RWF | 10% |
| Pro Max | 3.0x | 12,000 RWF | 20% |

**Example Earning Scenarios:**

*Scenario 1: Refer free-tier user*
- Referred user completes task: +500 RWF
- Referrer bonus: 500 × 5% = **25 RWF**

*Scenario 2: Refer pro-tier user*
- Referred user completes task: +1,000 RWF (2x multiplier)
- Referrer bonus: 1,000 × 10% = **100 RWF**

*Scenario 3: Refer pro_max-tier user*
- Referred user completes task: +1,500 RWF (3x multiplier)
- Referrer bonus: 1,500 × 20% = **300 RWF**

---

## 5. Data Flow - Detailed Timeline

### Phase 1: Registration with Referral Link
```
User clicks: https://fast-earn.vercel.app/register?ref=REFERRER_ID
    ↓
registerUser() reads referralCode = REFERRER_ID
    ↓
trackReferralSignup(REFERRER_ID, NEW_USER_ID)
    ↓
CREATE referrals record:
  - referrer_id: REFERRER_ID
  - referred_user_id: NEW_USER_ID
  - reward: 0
  - reference_type: 'referral_signup'
```

### Phase 2: Referred User Completes Task
```
Referred user submits task → approve task_completion
    ↓
complete-task API called
    ↓
creditReferralBonus(referred_user_id, reward_amount)
    ↓
1. Get referred_by field from referred user → REFERRER_ID
2. Get referred user's tier (free/pro/pro_max)
3. Calculate: bonus = reward_amount × tier_bonus_rate
4. UPDATE referrals SET reward += bonus
5. UPDATE users SET:
   - balance += bonus
7. INSERT wallet_transactions record
```

### Phase 3: Referrer Views Earnings
```
Referrer views dashboard
    ↓
Frontend displays referral_earnings field from users table
    ↓
Shows accumulated bonuses from all referred users
```

---

## 6. Current Issues & Gap Analysis

### ✅ Working Features
- ✓ Referral link generation and sharing
- ✓ Bonus calculation by tier
- ✓ Automatic credit on task completion
- ✓ Balance accumulation
- ✓ Transaction logging

### ⚠️ Incomplete/Unused Features
1. **Claimed Rewards System**
   - `referrals.is_claimed` and `claimed_at` fields never used
   - No admin approval workflow for claiming bonuses
   - Bonuses auto-credited instead of pending approval

2. **Tier Bonus Discrepancy**
   - `referrals.reward_tier_bonus` field exists but never populated
   - Tier bonus logic built into `complete-task` API instead

3. **No Admin Dashboard**
   - No page to view referral statistics
   - `getReferralStats()` function not integrated into frontend
   - No admin controls for referral program management

4. **No Referral Tracking UI**
   - Users can't see who they referred
   - No list of referral earnings breakdown
   - Only total `referral_earnings` visible

5. **Referrer Cache Issue**
   - Bonus calculation reads referrer info from users table
   - Could be stale if user tier changes between signup and earning

---

## 7. Edge Cases & Security Considerations

### Handled Safely ✓
- Duplicate referral prevention (UNIQUE constraint)
- Non-fatal bonus failures (don't block task completion)
- Bearer token validation on complete-task endpoint
- RLS policies protect referral data

### Potential Issues
- **Self-Referral:** Could refer own account via different signup
  - *Mitigation Needed:* Add check in `trackReferralSignup`
  
- **Referral Chain:** User A → User B → User C
  - *Current:* Only direct referrer credited
  - *Could enhance:* Multi-level commission structure
  
- **Tier Downgrade:** User was pro_max (20%), downgraded to free
  - *Current:* Bonus recalculates at current tier
  - *Alternative:* Use tier at time of referral signup

---

## 8. Database Queries Performance

**Current Indexes:**
```sql
-- No specific indexes for referral queries
-- Bonus calculation queries (lines 124-150 of complete-task):
SELECT referred_by FROM users WHERE id = userId         -- Uses PK
SELECT * FROM referrals WHERE referrer_id = X AND referred_user_id = Y
```

**Potential Optimization:**
```sql
CREATE INDEX idx_referrals_referrer_user 
ON referrals(referrer_id, referred_user_id);
```

---

## 9. Integration Points

| Component | Function | Impact |
|-----------|----------|--------|
| User Registration | trackReferralSignup() | Creates referral record |
| Task Completion | creditReferralBonus() | Calculates & credits bonus |
| Dashboard | Display referral_earnings | User sees total earned |
| User Profile | Subscription tier check | Affects bonus rate |

---

## 10. Recommendations

### High Priority
1. **Add self-referral prevention** in `trackReferralSignup()`
2. **Create referral analytics dashboard** for users to track referrals
3. **Add referral management page** in admin panel
4. **Index referral lookups** for better performance

### Medium Priority
1. Populate `reward_tier_bonus` consistently
2. Add referral history export/download
3. Implement fraud detection for abnormal referral patterns
4. Create referral bonus limits (e.g., max per day/month)

### Low Priority
1. Multi-level commission structure
2. Seasonal referral bonuses
3. Referral-based badges/achievements
4. Leaderboard for top referrers

---

## Summary

The referral program is **functional but minimalist**. It successfully:
- Tracks referee relationships
- Calculates tier-based bonuses
- Credits earnings automatically
- Integrates with wallet system

However, it lacks visibility and administration features. Users can't easily track their referrals, and there's no admin oversight of the program. The implementation prioritizes simplicity and non-blocking design, but could benefit from more robust tracking and dashboards.
