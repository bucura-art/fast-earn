-- Apply this complete block in the Supabase SQL Editor for an existing database.
-- It replaces the auth.users trigger function and removes Gmail-based auto-verification.
CREATE OR REPLACE FUNCTION public.sync_user_to_public()
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
