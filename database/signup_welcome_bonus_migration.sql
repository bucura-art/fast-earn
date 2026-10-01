-- Apply this complete file in the Supabase SQL Editor for an existing database.
-- Future signups always receive 6,000 RWF; valid referrers receive 3,000 RWF.
CREATE OR REPLACE FUNCTION public.award_signup_referral_bonus()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $award_signup_referral_bonus$
DECLARE
    v_referral_id UUID;
    v_existing_welcome_transaction UUID;
BEGIN
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
$award_signup_referral_bonus$;

DROP TRIGGER IF EXISTS trg_award_signup_referral_bonus ON public.users;
CREATE TRIGGER trg_award_signup_referral_bonus
    AFTER INSERT ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.award_signup_referral_bonus();
