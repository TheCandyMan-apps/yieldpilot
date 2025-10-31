-- Fix SECURITY DEFINER functions by setting search_path

-- Update update_discussion_reply_count function with fixed search_path
CREATE OR REPLACE FUNCTION public.update_discussion_reply_count()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_discussions
    SET reply_count = reply_count + 1
    WHERE id = NEW.discussion_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_discussions
    SET reply_count = GREATEST(0, reply_count - 1)
    WHERE id = OLD.discussion_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Update track_price_changes function with fixed search_path
CREATE OR REPLACE FUNCTION public.track_price_changes()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Create limited preview view for anonymous users
CREATE OR REPLACE VIEW public.v_public_deal_preview AS
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

-- Drop old policy and create new one for safer anonymous access
DROP POLICY IF EXISTS "Public users can view limited deal preview" ON public.deals_feed;

-- Create policy for anonymous users with limited visibility
-- The view provides additional protection by limiting columns
CREATE POLICY "Anonymous users see limited preview only"
ON public.deals_feed FOR SELECT
TO anon
USING (
  is_active = true AND 
  id IN (SELECT deal_id FROM public.get_preview_deal_ids())
);