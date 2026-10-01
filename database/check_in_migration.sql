-- Apply this migration in the Supabase SQL Editor for an existing database.
BEGIN;

CREATE TABLE IF NOT EXISTS public.check_ins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    check_in_date DATE NOT NULL,
    reward_amount NUMERIC NOT NULL DEFAULT 50 CHECK (reward_amount = 50),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, check_in_date)
);

ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own check-ins" ON public.check_ins;
CREATE POLICY "Users can view their own check-ins" ON public.check_ins
    FOR SELECT
    USING (user_id = auth.uid() OR get_is_admin());

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

COMMIT;
