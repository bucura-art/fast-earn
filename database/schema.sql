-- Enable UUID ✅DONE
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TIERS ✅DONE
CREATE TABLE tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    monthly_price NUMERIC DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO tiers (name, monthly_price)
VALUES
('free', 0),
('pro', 6000),
('pro_max', 12000);

-- USERS (Updated with role, admin fields, and referral tracking)✅DONE
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    country TEXT,
    payout_method TEXT,
    tier_id UUID REFERENCES tiers(id), 
    role TEXT CHECK (role IN ('user', 'admin')) DEFAULT 'user',
    balance NUMERIC DEFAULT 0,
    total_earned NUMERIC DEFAULT 0,
    referral_earnings NUMERIC DEFAULT 0,
    referred_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    is_suspended BOOLEAN DEFAULT FALSE,
    ip_addresses TEXT[] DEFAULT ARRAY[]::TEXT[],
    device_fingerprints TEXT[] DEFAULT ARRAY[]::TEXT[],
    last_login TIMESTAMP,
    failed_login_attempts INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- TASKS ✅DONE
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT CHECK (category IN ('video','click','follow','subscribe','install')),
    base_reward NUMERIC NOT NULL,
    total_budget NUMERIC NOT NULL,
    completion_count INT DEFAULT 0,
    remaining_budget NUMERIC NOT NULL,
    min_watch_seconds INT DEFAULT 30,
    external_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_upsell BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- TASK COMPLETIONS ✅DONE
CREATE TABLE task_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    reward_given NUMERIC NOT NULL,
    status TEXT CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
    ip_address TEXT,
    device_fingerprint TEXT,
    proof_url TEXT,
    watch_duration INT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- WALLET TRANSACTIONS ✅DONE
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('credit','debit')),
    amount NUMERIC NOT NULL,
    reference_type TEXT,
    reference_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

-- DAILY CHECK-INS
CREATE TABLE IF NOT EXISTS check_ins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    check_in_date DATE NOT NULL,
    reward_amount NUMERIC NOT NULL DEFAULT 50 CHECK (reward_amount = 50),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, check_in_date)
);

-- WITHDRAWALS ✅DONE
CREATE TABLE withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    method TEXT CHECK (method IN ('mtn', 'airtel', 'bank')),
    status TEXT CHECK (status IN ('pending','approved','rejected','paid')) DEFAULT 'pending',
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    review_notes TEXT,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- REFERRALS (Track all referral rewards earned)✅DONE
CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reward NUMERIC DEFAULT 0,
    reward_tier_bonus NUMERIC DEFAULT 0,
    is_claimed BOOLEAN DEFAULT FALSE,
    claimed_at TIMESTAMP,
    reference_type TEXT DEFAULT 'referral_signup',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(referrer_id, referred_user_id)
);

-- SUBSCRIPTIONS ✅DONE
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tier_id UUID REFERENCES tiers(id),
    start_date TIMESTAMP DEFAULT NOW(),
    end_date TIMESTAMP,
    status TEXT CHECK (status IN ('active','expired','cancelled')) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- FRAUD LOGS ✅DONE
CREATE TABLE fraud_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    fraud_type TEXT,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT,
    action_taken TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ADMIN ACTIVITIES LOG (for audit trail) ✅DONE
CREATE TABLE admin_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id UUID,
    changes JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- SYSTEM SETTINGS (for admin configuration) ✅DONE
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================
-- The following policies implement a conservative access model:
-- - Admins (users.role = 'admin') handle all platform management: users, tasks, withdrawals, fraud, support chats, and upgrades.
-- - Resource owners (matching user_id or created_by) can read and manage their own rows where appropriate.
-- - Public consumers can read active tasks.
-- Notes:
-- - Run this file in Supabase SQL Editor to create tables and policies.
-- - Review and tighten policies as needed for your deployment.
-- - Moderator role has been consolidated into admin role.

-- =========================================
-- Helper Function: Check if current user is admin ✅DONE
-- =========================================
CREATE OR REPLACE FUNCTION get_is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS and policies for users 
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage users" ON users
    FOR ALL
    USING (get_is_admin())
    WITH CHECK (get_is_admin());

CREATE POLICY "Users can select own profile" ON users
    FOR SELECT
    USING (id = auth.uid() OR get_is_admin());

CREATE POLICY "Users can insert their profile" ON users
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND id = auth.uid());

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE
    USING (id = auth.uid() OR get_is_admin())
    WITH CHECK (id = auth.uid() OR get_is_admin());

-- Tiers (read-only to public, admins can manage)
ALTER TABLE tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage tiers" ON tiers
    FOR ALL
    USING (get_is_admin())
    WITH CHECK (get_is_admin());

CREATE POLICY "Public can read tiers" ON tiers
    FOR SELECT
    USING (true);

-- Tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage tasks" ON tasks
    FOR ALL
    USING (get_is_admin())
    WITH CHECK (get_is_admin());

CREATE POLICY "Public can read active tasks" ON tasks
    FOR SELECT
    USING (is_active = true OR created_by = auth.uid() OR get_is_admin());

CREATE POLICY "Creators and admins can insert tasks" ON tasks
    FOR INSERT
    WITH CHECK (created_by = auth.uid() OR get_is_admin());

CREATE POLICY "Creators and admins can update tasks" ON tasks
    FOR UPDATE
    USING (created_by = auth.uid() OR get_is_admin())
    WITH CHECK (created_by = auth.uid() OR get_is_admin());

CREATE POLICY "Creators and admins can delete tasks" ON tasks
    FOR DELETE
    USING (created_by = auth.uid() OR get_is_admin());

-- Task Completions
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert their completions" ON task_completions
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can view their completions" ON task_completions
    FOR SELECT
    USING (user_id = auth.uid() OR get_is_admin());

CREATE POLICY "Admins can update completions" ON task_completions
    FOR UPDATE
    USING (get_is_admin())
    WITH CHECK (get_is_admin());

CREATE POLICY "Admins can delete completions" ON task_completions
    FOR DELETE
    USING (get_is_admin());

CREATE POLICY "Users can update own completions" ON task_completions
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Wallet Transactions
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their wallet transactions" ON wallet_transactions
    FOR SELECT
    USING (user_id = auth.uid() OR get_is_admin());

CREATE POLICY "Service/Admin can insert transactions" ON wallet_transactions
    FOR INSERT
    WITH CHECK (user_id IS NOT NULL AND (user_id = auth.uid() OR get_is_admin()));

-- Check-ins are recorded and credited only through the service-only RPC below.
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own check-ins" ON check_ins;
CREATE POLICY "Users can view their own check-ins" ON check_ins
    FOR SELECT
    USING (user_id = auth.uid() OR get_is_admin());

-- Withdrawals
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can request withdrawals" ON withdrawals
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can view own withdrawals" ON withdrawals
    FOR SELECT
    USING (user_id = auth.uid() OR get_is_admin());

CREATE POLICY "Admins can update withdrawals" ON withdrawals
    FOR UPDATE
    USING (get_is_admin())
    WITH CHECK (get_is_admin());

CREATE POLICY "Admins can delete withdrawals" ON withdrawals
    FOR DELETE
    USING (get_is_admin());

-- Subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can select own subscriptions" ON subscriptions
    FOR SELECT
    USING (user_id = auth.uid() OR get_is_admin());

CREATE POLICY "Users can insert own subscriptions" ON subscriptions
    FOR INSERT
    WITH CHECK (user_id = auth.uid() OR get_is_admin());

CREATE POLICY "Users can update subscriptions" ON subscriptions
    FOR UPDATE
    USING (user_id = auth.uid() OR get_is_admin())
    WITH CHECK (user_id = auth.uid() OR get_is_admin());

CREATE POLICY "Users can delete subscriptions" ON subscriptions
    FOR DELETE
    USING (user_id = auth.uid() OR get_is_admin());

-- Fraud Logs
ALTER TABLE fraud_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can select fraud logs" ON fraud_logs
    FOR SELECT
    USING (get_is_admin());

CREATE POLICY "Admins can insert fraud logs" ON fraud_logs
    FOR INSERT
    WITH CHECK (get_is_admin());

CREATE POLICY "Admins can update fraud logs" ON fraud_logs
    FOR UPDATE
    USING (get_is_admin())
    WITH CHECK (get_is_admin());

CREATE POLICY "Admins can delete fraud logs" ON fraud_logs
    FOR DELETE
    USING (get_is_admin());

-- Admin Activities (audit trail) - admins only
ALTER TABLE admin_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can select activities" ON admin_activities
    FOR SELECT
    USING (get_is_admin());

CREATE POLICY "Admins can insert activities" ON admin_activities
    FOR INSERT
    WITH CHECK (get_is_admin());

CREATE POLICY "Admins can update activities" ON admin_activities
    FOR UPDATE
    USING (get_is_admin())
    WITH CHECK (get_is_admin());

CREATE POLICY "Admins can delete activities" ON admin_activities
    FOR DELETE
    USING (get_is_admin());

-- System Settings - admins only
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can select settings" ON system_settings
    FOR SELECT
    USING (get_is_admin());

CREATE POLICY "Admins can insert settings" ON system_settings
    FOR INSERT
    WITH CHECK (get_is_admin());

CREATE POLICY "Admins can update settings" ON system_settings
    FOR UPDATE
    USING (get_is_admin())
    WITH CHECK (get_is_admin());

CREATE POLICY "Admins can delete settings" ON system_settings
    FOR DELETE
    USING (get_is_admin());

-- Allow public to read momo_pay_code setting
CREATE POLICY "Public can read momo_pay_code" ON system_settings
    FOR SELECT
    USING (key = 'momo_pay_code');

-- Seed momo_pay_code
INSERT INTO system_settings (key, value)
VALUES ('momo_pay_code', '387483')
ON CONFLICT (key) DO NOTHING;

-- Recommended follow-ups:
-- 1) Create server-side stored procedures for safe operations (e.g. approve_withdrawal, refund_on_reject, award_task_reward).

-- =========================================
-- Support / Conversations / Requests (Phase 6 additions)
-- =========================================

-- Conversations table to store chat sessions between users and support/admin ✅DONE
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    subject TEXT,
    status TEXT CHECK (status IN ('open','closed')) DEFAULT 'open',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL, -- admin handling the conversation
    is_read BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages for conversations (system, user, admin) ✅DONE
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_role TEXT CHECK (sender_role IN ('user','admin','system')) DEFAULT 'user',
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    content TEXT,
    message_type TEXT CHECK (message_type IN ('suggested','system','text','action')) DEFAULT 'text',
    metadata JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Upgrade requests created when a user starts the upgrade chatbot flow ✅DONE
CREATE TABLE upgrade_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    requested_tier_id UUID REFERENCES tiers(id) NOT NULL,
    amount NUMERIC NOT NULL,
    paid_phone TEXT, -- phone used to pay (entered by user after selecting DONE)
    status TEXT CHECK (status IN ('pending','confirmed','rejected')) DEFAULT 'pending',
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL, -- admin who confirmed
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Augment withdrawals to capture contact phone the user used to confirm ✅DONE
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- Enable RLS on new tables ✅DONE
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE upgrade_requests ENABLE ROW LEVEL SECURITY;

-- Conversations policies ✅DONE
CREATE POLICY "Conversations: users can select their own" ON conversations
    FOR SELECT
    USING (user_id = auth.uid() OR get_is_admin());

CREATE POLICY "Conversations: users and admins can insert" ON conversations
    FOR INSERT
    WITH CHECK (get_is_admin() OR auth.uid() IS NOT NULL);

CREATE POLICY "Conversations: users can update their own, admins manage all" ON conversations
    FOR UPDATE
    USING (user_id = auth.uid() OR get_is_admin())
    WITH CHECK (user_id = auth.uid() OR get_is_admin());

CREATE POLICY "Conversations: only admins can delete" ON conversations
    FOR DELETE
    USING (get_is_admin());

-- Messages policies ✅DONE
CREATE POLICY "Messages: participants can read messages" ON messages
    FOR SELECT
    USING (EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND (c.user_id = auth.uid() OR get_is_admin())));

CREATE POLICY "Messages: participants can insert" ON messages
    FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND (c.user_id = auth.uid() OR get_is_admin())));

CREATE POLICY "Messages: only admins can update" ON messages
    FOR UPDATE
    USING (get_is_admin())
    WITH CHECK (get_is_admin());

CREATE POLICY "Messages: only admins can delete" ON messages
    FOR DELETE
    USING (get_is_admin());

-- Upgrade Requests policies ✅DONE
CREATE POLICY "UpgradeRequests: users can select their own, admins see all" ON upgrade_requests
    FOR SELECT
    USING (user_id = auth.uid() OR get_is_admin());

CREATE POLICY "UpgradeRequests: users can create, admins can insert" ON upgrade_requests
    FOR INSERT
    WITH CHECK (user_id = auth.uid() OR get_is_admin());

CREATE POLICY "UpgradeRequests: users can update own, admins can manage" ON upgrade_requests
    FOR UPDATE
    USING (user_id = auth.uid() OR get_is_admin())
    WITH CHECK (user_id = auth.uid() OR get_is_admin());

CREATE POLICY "UpgradeRequests: only admins can delete" ON upgrade_requests
    FOR DELETE
    USING (get_is_admin());

-- Note: after applying these schema changes, run Supabase SQL migration and verify RLS policies.
-- =========================================
-- Triggers / Functions
-- =========================================
-- Utility to keep `updated_at` columns current ✅DONE
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach to tables that have an `updated_at` column ✅DONE
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN
        CREATE TRIGGER trg_conversations_updated_at
            BEFORE UPDATE ON conversations
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'upgrade_requests') THEN
        CREATE TRIGGER trg_upgrade_requests_updated_at
            BEFORE UPDATE ON upgrade_requests
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END$$;

-- Function to update task completion count
CREATE OR REPLACE FUNCTION update_task_completion_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.status = 'approved') THEN
        UPDATE tasks SET completion_count = completion_count + 1 WHERE id = NEW.task_id;
    ELSIF (TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status <> 'approved') THEN
        UPDATE tasks SET completion_count = completion_count + 1 WHERE id = NEW.task_id;
    ELSIF (TG_OP = 'UPDATE' AND OLD.status = 'approved' AND NEW.status <> 'approved') THEN
        UPDATE tasks SET completion_count = completion_count - 1 WHERE id = NEW.task_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update task completion count on task_completions table
DROP TRIGGER IF EXISTS trg_update_task_completion_count ON task_completions;
CREATE TRIGGER trg_update_task_completion_count
AFTER INSERT OR UPDATE ON task_completions
FOR EACH ROW
EXECUTE FUNCTION update_task_completion_count();

-- Auto-sync new users from auth.users to public.users
-- This function runs as SECURITY DEFINER so it can write to the `public.users`
-- table even when RLS is enabled. Run this migration as the database owner
-- (Supabase SQL editor) and then set the function owner to the DB owner role
-- (e.g. postgres) if necessary:
-- ALTER FUNCTION sync_user_to_public() OWNER TO postgres;

-- Ensure old trigger is removed (in case a prior disabled/incorrect trigger exists)
DROP TRIGGER IF EXISTS trg_sync_user_to_public ON auth.users;

CREATE OR REPLACE FUNCTION sync_user_to_public()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $sync_user_to_public$
DECLARE
    v_full_name TEXT;
    v_phone TEXT;
    v_referred_by UUID;
    v_is_verified BOOLEAN := FALSE;
BEGIN
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
    v_phone := NULLIF(BTRIM(NEW.raw_user_meta_data->>'phone'), '');
    BEGIN
        v_referred_by := NULLIF(BTRIM(NEW.raw_user_meta_data->>'referred_by'), '')::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
        v_referred_by := NULL;
    END;

    IF v_referred_by = NEW.id OR NOT EXISTS (
        SELECT 1 FROM public.users WHERE id = v_referred_by
    ) THEN
        v_referred_by := NULL;
    END IF;

    IF NEW.raw_user_meta_data ? 'is_verified' THEN
        v_is_verified := (NEW.raw_user_meta_data->>'is_verified')::BOOLEAN;
    END IF;

    -- Insert or update profile in public.users using the auth user's id
    INSERT INTO public.users (id, email, full_name, phone, referred_by, role, is_verified, created_at)
    VALUES (
        NEW.id,
        NEW.email,
        v_full_name,
        v_phone,
        v_referred_by,
        'user',
        v_is_verified,
        NEW.created_at
    )
    ON CONFLICT (id) DO UPDATE
    SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        phone = COALESCE(EXCLUDED.phone, public.users.phone),
        is_verified = EXCLUDED.is_verified;

    RETURN NEW;
END;
$sync_user_to_public$;

-- Recreate the trigger so it runs after auth user inserts
CREATE TRIGGER trg_sync_user_to_public
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION sync_user_to_public();

-- Credit the welcome bonus for every new profile and a referral bonus when applicable.
CREATE OR REPLACE FUNCTION award_signup_referral_bonus()
RETURNS TRIGGER AS $$
DECLARE
    v_referral_id UUID;
    v_existing_welcome_transaction UUID;
BEGIN
    -- Serialize processing for this user and make the welcome credit idempotent.
    PERFORM 1
    FROM public.users
    WHERE id = NEW.id
    FOR UPDATE;

    SELECT id
    INTO v_existing_welcome_transaction
    FROM public.wallet_transactions
    WHERE user_id = NEW.id
      AND type = 'credit'
      AND reference_type = 'welcome_bonus'
    LIMIT 1;

    IF v_existing_welcome_transaction IS NULL THEN
        UPDATE public.users
        SET balance = COALESCE(balance, 0) + 6000
        WHERE id = NEW.id;

        INSERT INTO public.wallet_transactions (user_id, type, amount, reference_type, reference_id)
        VALUES (NEW.id, 'credit', 6000, 'welcome_bonus', NEW.id);
    END IF;

    IF NEW.referred_by IS NULL
       OR NEW.referred_by = NEW.id
       OR NOT EXISTS (SELECT 1 FROM public.users WHERE id = NEW.referred_by) THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.referrals (
        referrer_id,
        referred_user_id,
        reward,
        reward_tier_bonus,
        is_claimed,
        claimed_at,
        reference_type
    )
    VALUES (
        NEW.referred_by,
        NEW.id,
        3000,
        0,
        TRUE,
        NOW(),
        'referral_signup'
    )
    ON CONFLICT (referrer_id, referred_user_id) DO NOTHING
    RETURNING id INTO v_referral_id;

    IF v_referral_id IS NULL THEN
        RETURN NEW;
    END IF;

    UPDATE public.users
    SET
        balance = COALESCE(balance, 0) + 3000,
        referral_earnings = COALESCE(referral_earnings, 0) + 3000
    WHERE id = NEW.referred_by;

    INSERT INTO public.wallet_transactions (user_id, type, amount, reference_type, reference_id)
    VALUES (NEW.referred_by, 'credit', 3000, 'referral_bonus', v_referral_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_award_signup_referral_bonus ON public.users;
CREATE TRIGGER trg_award_signup_referral_bonus
    AFTER INSERT ON public.users
    FOR EACH ROW EXECUTE FUNCTION award_signup_referral_bonus();

-- =========================================
-- Indexes
-- =========================================
-- Improve common query performance with indexes on frequently filtered/sorted columns ✅DONE
CREATE INDEX IF NOT EXISTS idx_tasks_is_active ON tasks (is_active);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks (category);
CREATE INDEX IF NOT EXISTS idx_tasks_remaining_budget ON tasks (remaining_budget);

CREATE INDEX IF NOT EXISTS idx_task_completions_user_task ON task_completions (user_id, task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON wallet_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_upgrade_requests_user_status ON upgrade_requests (user_id, status);

-- =========================================
-- Constraints / Data validation
-- =========================================
-- Ensure budgets and rewards are non-negative ✅DONE
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_positive_budget') THEN
        ALTER TABLE tasks ADD CONSTRAINT tasks_positive_budget CHECK (total_budget >= 0 AND base_reward >= 0 AND remaining_budget >= 0);
    END IF;
END$$;



-- Create referrals table for tracking all referral rewards
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reward NUMERIC DEFAULT 0,
    reward_tier_bonus NUMERIC DEFAULT 0,
    is_claimed BOOLEAN DEFAULT FALSE,
    claimed_at TIMESTAMP,
    reference_type TEXT DEFAULT 'referral_signup',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(referrer_id, referred_user_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_is_claimed ON referrals(is_claimed);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);

-- =========================================
-- RLS POLICIES FOR REFERRALS TABLE
-- =========================================

-- Enable RLS on referrals table
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own referrals (as referrer)
CREATE POLICY "users_can_view_own_referrals_as_referrer" 
ON referrals FOR SELECT 
USING (auth.uid() = referrer_id);

-- Allow users to view referrals where they were referred
CREATE POLICY "users_can_view_own_referrals_as_referred" 
ON referrals FOR SELECT 
USING (auth.uid() = referred_user_id);

-- Allow admins to view all referrals
CREATE POLICY "admins_can_view_all_referrals" 
ON referrals FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Allow admins to update referral claims
CREATE POLICY "admins_can_update_referrals" 
ON referrals FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Prevent users from inserting their own referrals (backend only)
CREATE POLICY "admins_can_insert_referrals" 
ON referrals FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- =========================================
-- PROMO CODES TABLE & SYSTEM
-- =========================================

-- Promo codes table for managing discount codes ✅DONE
CREATE TABLE IF NOT EXISTS promo_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 20,
    is_active BOOLEAN DEFAULT TRUE,
    max_uses INT,
    used_count INT DEFAULT 0,
    valid_from TIMESTAMP DEFAULT NOW(),
    valid_until TIMESTAMP,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster promo code lookups
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_is_active ON promo_codes(is_active);

-- Add promo_code field to upgrade_requests table
ALTER TABLE upgrade_requests
ADD COLUMN IF NOT EXISTS promo_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_amount NUMERIC;

-- Enable RLS on promo_codes table
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Allow public to read active promo codes (for validation)
CREATE POLICY "public_can_read_active_promo_codes" 
ON promo_codes FOR SELECT 
USING (is_active = true);

-- Allow admins to manage promo codes
CREATE POLICY "admins_can_manage_promo_codes" 
ON promo_codes FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Seed promo codes ✅DONE
INSERT INTO promo_codes (code, discount_percent, description, valid_from, valid_until, is_active)
VALUES 
  ('MTN Rwanda', 20, 'MTN Rwanda partnership promo', NOW(), NOW() + INTERVAL '1 year', TRUE),
  ('BK Arena', 20, 'BK Arena promotion', NOW(), NOW() + INTERVAL '1 year', TRUE),
  ('Visit Rwanda', 20, 'Visit Rwanda tourism promo', NOW(), NOW() + INTERVAL '1 year', TRUE)
ON CONFLICT (code) DO NOTHING;

-- =========================================
-- LEADERBOARD FUNCTIONS
-- =========================================

-- Function to get top referrers for the leaderboard✅DONE
CREATE OR REPLACE FUNCTION get_top_referrers(limit_count INT DEFAULT 20)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  referral_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.referrer_id AS user_id,
    COALESCE(u.full_name, 'Unknown User') AS full_name,
    COUNT(r.id) AS referral_count
  FROM referrals r
  JOIN users u ON r.referrer_id = u.id
  GROUP BY r.referrer_id, u.full_name
  ORDER BY referral_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get admin dashboard stats efficiently✅DONE
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS TABLE (
  total_users BIGINT,
  active_users BIGINT,
  total_distributed NUMERIC,
  total_payouts NUMERIC,
  active_tasks BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM users)::BIGINT,
    (SELECT COUNT(*) FROM users WHERE last_login > NOW() - INTERVAL '30 days')::BIGINT,
    (SELECT COALESCE(SUM(amount), 0) FROM wallet_transactions WHERE type = 'credit')::NUMERIC,
    (SELECT COALESCE(SUM(amount), 0) FROM withdrawals WHERE status IN ('approved', 'paid'))::NUMERIC,
    (SELECT COUNT(*) FROM tasks WHERE is_active = TRUE)::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's minimum withdrawal amount based on their tier✅DONE
CREATE OR REPLACE FUNCTION get_user_minimum_withdrawal(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    min_amount NUMERIC;
BEGIN
    SELECT t.min_withdrawal_amount INTO min_amount
    FROM users u
    JOIN tiers t ON u.tier_id = t.id
    WHERE u.id = p_user_id;

    -- Return default free tier amount if user has no tier or something is wrong
    RETURN COALESCE(min_amount, 5000);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aggregate a user's lifetime credited income by earning source.
DROP FUNCTION IF EXISTS public.get_user_income_breakdown();
CREATE OR REPLACE FUNCTION public.get_user_income_breakdown()
RETURNS TABLE (
    total_income NUMERIC,
    bonus_income NUMERIC,
    referral_income NUMERIC,
    check_in_income NUMERIC,
    task_income NUMERIC,
    video_income NUMERIC,
    products_income NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT
        COALESCE(SUM(wt.amount), 0),
        COALESCE(SUM(wt.amount) FILTER (WHERE wt.reference_type IN ('welcome_bonus', 'bonus')), 0),
        COALESCE(SUM(wt.amount) FILTER (WHERE wt.reference_type = 'referral_bonus'), 0),
        COALESCE(SUM(wt.amount) FILTER (WHERE wt.reference_type = 'check_in'), 0),
        COALESCE(SUM(wt.amount) FILTER (
            WHERE wt.reference_type = 'task_completion'
              AND tc.id IS NOT NULL
              AND t.category IS DISTINCT FROM 'video'
        ), 0),
        COALESCE(SUM(wt.amount) FILTER (
            WHERE wt.reference_type = 'task_completion'
              AND tc.id IS NOT NULL
              AND t.category = 'video'
        ), 0),
        COALESCE(SUM(wt.amount) FILTER (WHERE wt.reference_type = 'product_earning'), 0)
    FROM public.wallet_transactions AS wt
    LEFT JOIN public.task_completions AS tc
        ON wt.reference_type = 'task_completion'
       AND tc.id = wt.reference_id
       AND tc.user_id = wt.user_id
    LEFT JOIN public.tasks AS t ON t.id = tc.task_id
    WHERE wt.user_id = auth.uid()
      AND wt.type = 'credit';
$$;

REVOKE ALL ON FUNCTION public.get_user_income_breakdown() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_income_breakdown() TO authenticated;

-- Atomically award one daily check-in reward per user.
CREATE OR REPLACE FUNCTION public.complete_daily_check_in(p_user_id UUID)
RETURNS TABLE (
    already_checked_in BOOLEAN,
    reward_amount NUMERIC,
    balance_after NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    new_check_in_id UUID;
    updated_balance NUMERIC;
    today_utc DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
BEGIN
    INSERT INTO public.check_ins (user_id, check_in_date, reward_amount)
    VALUES (p_user_id, today_utc, 50)
    ON CONFLICT (user_id, check_in_date) DO NOTHING
    RETURNING id INTO new_check_in_id;

    IF new_check_in_id IS NULL THEN
        SELECT COALESCE(u.balance, 0)
        INTO updated_balance
        FROM public.users AS u
        WHERE u.id = p_user_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'User not found for daily check-in';
        END IF;

        RETURN QUERY SELECT TRUE, 0::NUMERIC, updated_balance;
        RETURN;
    END IF;

    UPDATE public.users AS u
    SET balance = COALESCE(u.balance, 0) + 50
    WHERE u.id = p_user_id
    RETURNING u.balance INTO updated_balance;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found for daily check-in';
    END IF;

    INSERT INTO public.wallet_transactions (user_id, type, amount, reference_type, reference_id)
    VALUES (p_user_id, 'credit', 50, 'check_in', new_check_in_id);

    RETURN QUERY SELECT FALSE, 50::NUMERIC, updated_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_daily_check_in(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_daily_check_in(UUID) TO service_role;
