-- Migration to update Foreign Key constraints to ON DELETE CASCADE / SET NULL
-- Run this in the Supabase SQL Editor

-- 1. USERS
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;
ALTER TABLE public.users ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_referred_by_fkey;
ALTER TABLE public.users ADD CONSTRAINT users_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- 2. TASKS
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- 3. TASK COMPLETIONS
ALTER TABLE public.task_completions DROP CONSTRAINT IF EXISTS task_completions_user_id_fkey;
ALTER TABLE public.task_completions ADD CONSTRAINT task_completions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.task_completions DROP CONSTRAINT IF EXISTS task_completions_task_id_fkey;
ALTER TABLE public.task_completions ADD CONSTRAINT task_completions_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;

-- 4. WALLET TRANSACTIONS
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_user_id_fkey;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 5. WITHDRAWALS
ALTER TABLE public.withdrawals DROP CONSTRAINT IF EXISTS withdrawals_user_id_fkey;
ALTER TABLE public.withdrawals ADD CONSTRAINT withdrawals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.withdrawals DROP CONSTRAINT IF EXISTS withdrawals_reviewed_by_fkey;
ALTER TABLE public.withdrawals ADD CONSTRAINT withdrawals_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- 6. SUBSCRIPTIONS
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 7. FRAUD LOGS
ALTER TABLE public.fraud_logs DROP CONSTRAINT IF EXISTS fraud_logs_user_id_fkey;
ALTER TABLE public.fraud_logs ADD CONSTRAINT fraud_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 8. ADMIN ACTIVITIES
ALTER TABLE public.admin_activities DROP CONSTRAINT IF EXISTS admin_activities_admin_id_fkey;
ALTER TABLE public.admin_activities ADD CONSTRAINT admin_activities_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- 9. SYSTEM SETTINGS
ALTER TABLE public.system_settings DROP CONSTRAINT IF EXISTS system_settings_updated_by_fkey;
ALTER TABLE public.system_settings ADD CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- 10. CONVERSATIONS
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_user_id_fkey;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_assigned_to_fkey;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;

-- 11. MESSAGES
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;
ALTER TABLE public.messages ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE public.messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- 12. UPGRADE REQUESTS
ALTER TABLE public.upgrade_requests DROP CONSTRAINT IF EXISTS upgrade_requests_user_id_fkey;
ALTER TABLE public.upgrade_requests ADD CONSTRAINT upgrade_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.upgrade_requests DROP CONSTRAINT IF EXISTS upgrade_requests_admin_id_fkey;
ALTER TABLE public.upgrade_requests ADD CONSTRAINT upgrade_requests_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- 13. REFERRALS (Check existence first to avoid errors if table missing)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'referrals') THEN
        -- Drop old constraints if they exist
        ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_referrer_id_fkey;
        ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_referred_user_id_fkey;
        
        -- Add new constraints
        ALTER TABLE public.referrals ADD CONSTRAINT referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.users(id) ON DELETE CASCADE;
        ALTER TABLE public.referrals ADD CONSTRAINT referrals_referred_user_id_fkey FOREIGN KEY (referred_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
END $$;