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