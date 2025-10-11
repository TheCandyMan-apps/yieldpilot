-- Fix function search_path for handle_updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Add RLS policy to prevent users from modifying their own subscription_tier
CREATE POLICY "Users cannot modify their own subscription tier"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND
  (
    -- Allow updates to all fields except subscription_tier
    subscription_tier = (SELECT subscription_tier FROM public.profiles WHERE id = auth.uid())
  )
);