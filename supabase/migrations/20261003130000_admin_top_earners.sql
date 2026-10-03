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
