-- Apply this migration in the Supabase SQL Editor for an existing database.
BEGIN;

CREATE OR REPLACE FUNCTION public.get_user_income_breakdown()
RETURNS TABLE (
    total_income NUMERIC,
    bonus_income NUMERIC,
    referral_income NUMERIC,
    check_in_income NUMERIC,
    task_income NUMERIC,
    video_income NUMERIC
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
        ), 0)
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

COMMIT;
