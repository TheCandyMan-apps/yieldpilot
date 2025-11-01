-- Fix SECURITY DEFINER functions missing search_path

-- Fix check_forecast_limit function
CREATE OR REPLACE FUNCTION check_forecast_limit(p_user_id UUID, p_tier TEXT)
RETURNS BOOLEAN AS $$
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
  FROM public.forecast_usage
  WHERE user_id = p_user_id
    AND created_at > CURRENT_DATE;

  RETURN usage_count < daily_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix log_user_activity function
CREATE OR REPLACE FUNCTION log_user_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_activity (user_id, action, resource_type, resource_id, metadata)
  VALUES (
    auth.uid(),
    TG_OP || '_' || TG_TABLE_NAME,
    TG_TABLE_NAME::TEXT,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'timestamp', NOW()
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix track_price_changes function
CREATE OR REPLACE FUNCTION track_price_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.price IS DISTINCT FROM NEW.price THEN
    INSERT INTO public.price_history (deal_id, old_price, new_price, price_change_pct)
    VALUES (
      NEW.id,
      OLD.price,
      NEW.price,
      ROUND(((NEW.price - OLD.price) / OLD.price * 100)::numeric, 2)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;