-- Create function to increment usage counters
CREATE OR REPLACE FUNCTION public.increment_usage_counter(
  p_user_id UUID,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ,
  p_field TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert or update usage counter
  INSERT INTO public.usage_counters (user_id, period_start, period_end, ingests_used, exports_used)
  VALUES (
    p_user_id,
    p_period_start,
    p_period_end,
    CASE WHEN p_field = 'ingests_used' THEN 1 ELSE 0 END,
    CASE WHEN p_field = 'exports_used' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id, period_start)
  DO UPDATE SET
    ingests_used = CASE 
      WHEN p_field = 'ingests_used' THEN usage_counters.ingests_used + 1
      ELSE usage_counters.ingests_used
    END,
    exports_used = CASE
      WHEN p_field = 'exports_used' THEN usage_counters.exports_used + 1
      ELSE usage_counters.exports_used
    END,
    updated_at = now();
END;
$$;