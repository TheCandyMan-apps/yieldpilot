-- Fix the view to use SECURITY INVOKER instead of default SECURITY DEFINER
CREATE OR REPLACE VIEW public.v_public_deal_preview
WITH (security_invoker = true)
AS
SELECT 
  id,
  city,
  postcode,
  price,
  bedrooms,
  property_type,
  investment_score as score_band,
  created_at
FROM public.deals_feed
WHERE id IN (SELECT deal_id FROM public.get_preview_deal_ids())
  AND is_active = true
LIMIT 10;