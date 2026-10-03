CREATE OR REPLACE FUNCTION public.get_admin_top_earners()
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  total_earned NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.get_is_admin() THEN
    RAISE EXCEPTION 'Admin access required'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.full_name,
    SUM(wt.amount)::NUMERIC
  FROM public.users AS u
  JOIN public.wallet_transactions AS wt ON wt.user_id = u.id
  WHERE u.role = 'user'
    AND wt.type = 'credit'
  GROUP BY u.id, u.full_name
  HAVING SUM(wt.amount) > 0
  ORDER BY SUM(wt.amount) DESC, u.full_name ASC NULLS LAST, u.id
  LIMIT 5;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_top_earners() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_top_earners() TO authenticated;

DROP FUNCTION IF EXISTS public.get_admin_dashboard_payout_stats();
CREATE FUNCTION public.get_admin_dashboard_payout_stats()
RETURNS TABLE (
  total_user_balance NUMERIC,
  total_bonus NUMERIC,
  total_rewards NUMERIC,
  total_product_roi NUMERIC,
  total_paid_out NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.get_is_admin() THEN
    RAISE EXCEPTION 'Admin access required'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COALESCE(SUM(balance), 0) FROM public.users WHERE role = 'user')::NUMERIC,
    (
      SELECT COALESCE(SUM(amount), 0)
      FROM public.wallet_transactions
      WHERE type = 'credit'
        AND reference_type IN ('welcome_bonus', 'bonus', 'check_in')
    )::NUMERIC,
    (
      SELECT COALESCE(SUM(amount), 0)
      FROM public.wallet_transactions
      WHERE type = 'credit'
        AND reference_type = 'task_completion'
    )::NUMERIC,
    (
      SELECT COALESCE(SUM(amount), 0)
      FROM public.wallet_transactions
      WHERE type = 'credit'
        AND reference_type = 'product_earning'
    )::NUMERIC,
    (
      SELECT COALESCE(SUM(amount), 0)
      FROM public.withdrawals
      WHERE status = 'paid'
    )::NUMERIC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_dashboard_payout_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_payout_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_performance_stats()
RETURNS TABLE (
  total_users BIGINT,
  active_users BIGINT,
  paid_users BIGINT,
  active_tasks BIGINT,
  active_products BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.get_is_admin() THEN
    RAISE EXCEPTION 'Admin access required'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.users)::BIGINT,
    (
      SELECT COUNT(*)
      FROM public.users
      WHERE last_login >= NOW() - INTERVAL '7 days'
    )::BIGINT,
    (
      SELECT COUNT(DISTINCT paid_users.user_id)
      FROM (
        SELECT user_id
        FROM public.upgrade_requests
        WHERE status = 'confirmed'
        UNION
        SELECT user_id
        FROM public.product_purchase_requests
        WHERE status = 'approved'
      ) AS paid_users
    )::BIGINT,
    (SELECT COUNT(*) FROM public.tasks WHERE is_active = TRUE)::BIGINT,
    (SELECT COUNT(*) FROM public.products WHERE is_active = TRUE)::BIGINT;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_dashboard_performance_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_performance_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_income_stats()
RETURNS TABLE (
  total_members BIGINT,
  total_investors BIGINT,
  membership_income NUMERIC,
  product_income NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.get_is_admin() THEN
    RAISE EXCEPTION 'Admin access required'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.users)::BIGINT,
    (
      SELECT COUNT(DISTINCT user_id)
      FROM public.product_purchase_requests
      WHERE status = 'approved'
    )::BIGINT,
    (
      SELECT COALESCE(SUM(COALESCE(final_amount, amount)), 0)
      FROM public.upgrade_requests
      WHERE status = 'confirmed'
    )::NUMERIC,
    (
      SELECT COALESCE(SUM(purchase_price), 0)
      FROM public.product_purchase_requests
      WHERE status = 'approved'
    )::NUMERIC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_dashboard_income_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_income_stats() TO authenticated;