-- Fix Supabase linter error: views executing with definer privileges
-- Change views to execute with invoker privileges so caller's RLS applies

-- Enable security_invoker on key public views (Postgres 15+)
DO $$
BEGIN
  -- v_investor_deals: make the view respect the querying user's permissions
  IF EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_investor_deals'
  ) THEN
    EXECUTE 'ALTER VIEW public.v_investor_deals SET (security_invoker = true)';
  END IF;

  -- v_public_deal_preview: make the view respect the querying user's permissions
  IF EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_public_deal_preview'
  ) THEN
    EXECUTE 'ALTER VIEW public.v_public_deal_preview SET (security_invoker = true)';
  END IF;
END$$;

-- Optional: document intent for future views
COMMENT ON SCHEMA public IS 'All views should be created WITH (security_invoker=true) to ensure RLS applies to callers.';