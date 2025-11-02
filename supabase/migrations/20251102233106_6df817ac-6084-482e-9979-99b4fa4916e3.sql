-- Security fix: Add bounds checking to increment function to prevent integer overflow
-- This addresses the DEFINER_OR_RPC_BYPASS security warning

DROP FUNCTION IF EXISTS public.increment(uuid, integer);

CREATE OR REPLACE FUNCTION public.increment(row_id uuid, x integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate ownership: only allow users to increment their own profile
  IF auth.uid() != row_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only update your own profile';
  END IF;
  
  -- Validate x is positive and within reasonable bounds (prevent overflow/abuse)
  IF x <= 0 OR x > 1000 THEN
    RAISE EXCEPTION 'Invalid increment value: must be between 1 and 1000';
  END IF;
  
  -- Perform the update with additional safety check
  UPDATE public.profiles
  SET analyses_count = analyses_count + x
  WHERE id = row_id
  AND auth.uid() = id;  -- Extra safety: ensure auth matches again
  
  -- Verify update succeeded
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found or unauthorized';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.increment(uuid, integer) IS 
  'Securely increment analyses_count with bounds checking (1-1000) and ownership validation';
