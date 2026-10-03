CREATE OR REPLACE FUNCTION public.get_admin_dashboard_payout_stats()
RETURNS TABLE (
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
