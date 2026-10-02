CREATE TABLE IF NOT EXISTS public.products (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    daily_income NUMERIC NOT NULL,
    duration_days INTEGER NOT NULL,
    image_path TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_purchase_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    product_code TEXT NOT NULL,
    product_name TEXT NOT NULL,
    purchase_price NUMERIC NOT NULL,
    daily_income NUMERIC NOT NULL,
    duration_days INTEGER NOT NULL,
    paid_phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_product_purchase_requests_user_created
    ON public.product_purchase_requests (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_purchase_requests_status_created
    ON public.product_purchase_requests (status, created_at);

CREATE TABLE IF NOT EXISTS public.product_earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_request_id UUID NOT NULL REFERENCES public.product_purchase_requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    earning_date DATE NOT NULL,
    amount NUMERIC NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (purchase_request_id, earning_date)
);

CREATE INDEX IF NOT EXISTS idx_product_earnings_user_date
    ON public.product_earnings (user_id, earning_date DESC);

-- The approval workflow must set status = 'approved' and starts_at, then call
-- this function in the same transaction to credit the first UTC earning day.
-- The daily job catches up any eligible earning dates that were missed.
CREATE OR REPLACE FUNCTION public.credit_product_earnings(
    p_as_of_date DATE DEFAULT (NOW() AT TIME ZONE 'UTC')::DATE
)
RETURNS TABLE (
    credits_created INTEGER,
    amount_credited NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    purchase RECORD;
    earning_day DATE;
    earning_id UUID;
    v_credits_created INTEGER := 0;
    v_amount_credited NUMERIC := 0;
BEGIN
    FOR purchase IN
        SELECT
            request.id AS purchase_request_id,
            request.user_id,
            request.daily_income,
            (request.starts_at AT TIME ZONE 'UTC')::DATE AS start_date,
            request.duration_days
        FROM public.product_purchase_requests AS request
        WHERE request.status = 'approved'
          AND request.starts_at IS NOT NULL
          AND request.duration_days > 0
          AND request.daily_income > 0
          AND (request.starts_at AT TIME ZONE 'UTC')::DATE <= p_as_of_date
    LOOP
        FOR earning_day IN
            SELECT purchase.start_date + day_offset
            FROM generate_series(0, purchase.duration_days - 1) AS offsets(day_offset)
            WHERE purchase.start_date + day_offset <= p_as_of_date
            ORDER BY day_offset
        LOOP
            earning_id := NULL;

            INSERT INTO public.product_earnings (
                purchase_request_id,
                user_id,
                earning_date,
                amount
            )
            VALUES (
                purchase.purchase_request_id,
                purchase.user_id,
                earning_day,
                purchase.daily_income
            )
            ON CONFLICT (purchase_request_id, earning_date) DO NOTHING
            RETURNING id INTO earning_id;

            IF earning_id IS NOT NULL THEN
                UPDATE public.users
                SET balance = COALESCE(balance, 0) + purchase.daily_income
                WHERE id = purchase.user_id;

                IF NOT FOUND THEN
                    RAISE EXCEPTION 'User not found for product purchase %', purchase.purchase_request_id;
                END IF;

                INSERT INTO public.wallet_transactions (
                    user_id,
                    type,
                    amount,
                    reference_type,
                    reference_id
                )
                VALUES (
                    purchase.user_id,
                    'credit',
                    purchase.daily_income,
                    'product_earning',
                    earning_id
                );

                v_credits_created := v_credits_created + 1;
                v_amount_credited := v_amount_credited + purchase.daily_income;
            END IF;
        END LOOP;
    END LOOP;

    RETURN QUERY SELECT v_credits_created, v_amount_credited;
END;
$$;


-- Approve or reject a product purchase request.
-- This function should be called by an admin or service role.
CREATE OR REPLACE FUNCTION public.approve_product_purchase_request(
    p_request_id UUID
)
RETURNS public.product_purchase_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    approved_request public.product_purchase_requests%ROWTYPE;
    approval_time TIMESTAMPTZ := NOW();
BEGIN
    SELECT *
    INTO approved_request
    FROM public.product_purchase_requests
    WHERE id = p_request_id
      AND status = 'pending'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pending product purchase request not found';
    END IF;

    IF approved_request.duration_days <= 0 OR approved_request.daily_income <= 0 THEN
        RAISE EXCEPTION 'Product purchase request has invalid earning terms';
    END IF;

    UPDATE public.product_purchase_requests
    SET
        status = 'approved',
        approved_at = approval_time,
        starts_at = approval_time,
        ends_at = approval_time + make_interval(days => approved_request.duration_days - 1),
        updated_at = approval_time
    WHERE id = p_request_id
    RETURNING * INTO approved_request;

    PERFORM public.credit_product_earnings();

    RETURN approved_request;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_product_earnings(DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_product_earnings(DATE) TO service_role;
REVOKE ALL ON FUNCTION public.approve_product_purchase_request(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_product_purchase_request(UUID) TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
DECLARE
    existing_job_id BIGINT;
BEGIN
    SELECT jobid
    INTO existing_job_id
    FROM cron.job
    WHERE jobname = 'credit-product-earnings-daily';

    IF existing_job_id IS NOT NULL THEN
        PERFORM cron.unschedule(existing_job_id);
    END IF;

    PERFORM cron.schedule(
        'credit-product-earnings-daily',
        '5 0 * * *',
        'SELECT public.credit_product_earnings();'
    );
END;
$$;