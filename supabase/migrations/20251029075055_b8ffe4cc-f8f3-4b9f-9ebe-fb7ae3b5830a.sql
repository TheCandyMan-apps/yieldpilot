-- Fix search path for check_forecast_limit function
DROP FUNCTION IF EXISTS check_forecast_limit(UUID, TEXT);

CREATE OR REPLACE FUNCTION check_forecast_limit(p_user_id UUID, p_tier TEXT)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  usage_count INTEGER;
  daily_limit INTEGER;
BEGIN
  -- Set limits per tier
  daily_limit := CASE p_tier
    WHEN 'free' THEN 1
    WHEN 'starter' THEN 3
    WHEN 'pro' THEN 10
    WHEN 'team' THEN -1  -- unlimited
    ELSE 1
  END;

  -- Unlimited for team
  IF daily_limit = -1 THEN
    RETURN TRUE;
  END IF;

  -- Count today's usage
  SELECT COUNT(*) INTO usage_count
  FROM forecast_usage
  WHERE user_id = p_user_id
    AND created_at > CURRENT_DATE;

  RETURN usage_count < daily_limit;
END;
$$;