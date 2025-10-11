-- Fix SECURITY DEFINER function to prevent unauthorized profile modifications
-- Drop the existing insecure increment function
DROP FUNCTION IF EXISTS public.increment(uuid, integer);

-- Recreate with proper security checks
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
  
  -- Validate x is positive: prevent users from decrementing or gaming the system
  IF x <= 0 THEN
    RAISE EXCEPTION 'Invalid value: increment must be positive';
  END IF;
  
  -- Perform the update
  UPDATE public.profiles
  SET analyses_count = analyses_count + x
  WHERE id = row_id;
END;
$$;