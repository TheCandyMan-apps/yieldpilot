-- Drop existing public access policy for deals_feed
DROP POLICY IF EXISTS "Anyone can view active deals" ON public.deals_feed;

-- Create limited public preview policy (first 10 deals only)
CREATE POLICY "Public users can view limited deal preview"
ON public.deals_feed
FOR SELECT
USING (
  is_active = true 
  AND id IN (
    SELECT id 
    FROM public.deals_feed 
    WHERE is_active = true 
    ORDER BY created_at DESC 
    LIMIT 10
  )
);

-- Update authenticated users policy to ensure full access
DROP POLICY IF EXISTS "Authenticated users can view all deals" ON public.deals_feed;

CREATE POLICY "Authenticated users can view all active deals"
ON public.deals_feed
FOR SELECT
TO authenticated
USING (is_active = true);

-- Similar hybrid approach for market_insights
DROP POLICY IF EXISTS "Anyone can view market insights" ON public.market_insights;

CREATE POLICY "Public users can view limited market insights"
ON public.market_insights
FOR SELECT
USING (
  id IN (
    SELECT id 
    FROM public.market_insights 
    ORDER BY updated_at DESC 
    LIMIT 10
  )
);

CREATE POLICY "Authenticated users can view all market insights"
ON public.market_insights
FOR SELECT
TO authenticated
USING (true);

-- Hybrid approach for area_analytics
DROP POLICY IF EXISTS "Anyone can view area analytics" ON public.area_analytics;

CREATE POLICY "Public users can view limited area analytics"
ON public.area_analytics
FOR SELECT
USING (
  id IN (
    SELECT id 
    FROM public.area_analytics 
    ORDER BY updated_at DESC 
    LIMIT 10
  )
);

CREATE POLICY "Authenticated users can view all area analytics"
ON public.area_analytics
FOR SELECT
TO authenticated
USING (true);

-- Hybrid approach for finance_products
DROP POLICY IF EXISTS "Anyone can view active finance products" ON public.finance_products;

CREATE POLICY "Public users can view limited finance products"
ON public.finance_products
FOR SELECT
USING (
  is_active = true 
  AND id IN (
    SELECT id 
    FROM public.finance_products 
    WHERE is_active = true 
    ORDER BY created_at DESC 
    LIMIT 5
  )
);

CREATE POLICY "Authenticated users can view all finance products"
ON public.finance_products
FOR SELECT
TO authenticated
USING (is_active = true);