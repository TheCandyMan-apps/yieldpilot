-- 1. Create the increment function for analyses_count
CREATE OR REPLACE FUNCTION public.increment(row_id uuid, x integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET analyses_count = analyses_count + x
  WHERE id = row_id;
END;
$$;

-- 2. Create helper function to check subscription tier without triggering RLS
CREATE OR REPLACE FUNCTION public.check_subscription_tier_unchanged(_user_id uuid, _new_tier text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT subscription_tier = _new_tier
  FROM public.profiles
  WHERE id = _user_id
$$;

-- 3. Drop the existing policy that has infinite recursion risk
DROP POLICY IF EXISTS "Users cannot modify their own subscription tier" ON public.profiles;

-- 4. Recreate the policy using the helper function
CREATE POLICY "Users cannot modify their own subscription tier"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND
  public.check_subscription_tier_unchanged(auth.uid(), subscription_tier)
);