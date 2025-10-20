-- Drop the problematic policy
DROP POLICY IF EXISTS "Public users can view limited deal preview" ON public.deals_feed;

-- Create a security definer function to get preview deal IDs
CREATE OR REPLACE FUNCTION public.get_preview_deal_ids()
RETURNS TABLE(deal_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.deals_feed
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 10
$$;

-- Recreate the policy using the security definer function
CREATE POLICY "Public users can view limited deal preview"
ON public.deals_feed
FOR SELECT
USING (
  (is_active = true) AND 
  (auth.uid() IS NULL) AND 
  (id IN (SELECT deal_id FROM public.get_preview_deal_ids()))
);

-- Update authenticated users policy to be more explicit
DROP POLICY IF EXISTS "Authenticated users can view all active deals" ON public.deals_feed;

CREATE POLICY "Authenticated users can view all active deals"
ON public.deals_feed
FOR SELECT
TO authenticated
USING (is_active = true);