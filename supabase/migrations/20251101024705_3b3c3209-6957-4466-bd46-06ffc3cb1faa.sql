-- Set fixed search_path on SECURITY DEFINER functions to satisfy linter warning
-- Safe to run multiple times
ALTER FUNCTION public.check_forecast_limit(uuid, text) SET search_path = public;
ALTER FUNCTION public.log_user_activity() SET search_path = public;
ALTER FUNCTION public.track_price_changes() SET search_path = public;