-- Security fixes: Add comprehensive RLS policies to premium tables
-- and tighten overly permissive policies on existing tables

-- ============================================================================
-- 1. Add RLS policies to premium_credits table
-- ============================================================================
ALTER TABLE public.premium_credits ENABLE ROW LEVEL SECURITY;

-- Users can view their own credits
CREATE POLICY "Users view own premium credits"
ON public.premium_credits
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only service role can manage credits (prevent user manipulation)
CREATE POLICY "Service manages premium credits"
ON public.premium_credits
FOR ALL
USING (false)
WITH CHECK (false);

-- ============================================================================
-- 2. Add RLS policies to premium_data_queries table
-- ============================================================================
ALTER TABLE public.premium_data_queries ENABLE ROW LEVEL SECURITY;

-- Users can view their own query history
CREATE POLICY "Users view own premium queries"
ON public.premium_data_queries
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own queries
CREATE POLICY "Users insert own premium queries"
ON public.premium_data_queries
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Prevent updates and deletes (audit trail)
CREATE POLICY "No updates to premium queries"
ON public.premium_data_queries
FOR UPDATE
USING (false);

CREATE POLICY "No deletes of premium queries"
ON public.premium_data_queries
FOR DELETE
USING (false);

-- ============================================================================
-- 3. Add RLS policies to portfolio_metrics table
-- ============================================================================
ALTER TABLE public.portfolio_metrics ENABLE ROW LEVEL SECURITY;

-- Users can view metrics for their portfolios
CREATE POLICY "Users view own portfolio metrics"
ON public.portfolio_metrics
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.portfolios
    WHERE portfolios.id = portfolio_metrics.portfolio_id
    AND portfolios.user_id = auth.uid()
  )
);

-- Only service role can insert/update metrics
CREATE POLICY "Service manages portfolio metrics"
ON public.portfolio_metrics
FOR ALL
USING (false)
WITH CHECK (false);

-- ============================================================================
-- 4. Tighten deals_feed policies - require authentication
-- ============================================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can view active deals" ON public.deals_feed;
DROP POLICY IF EXISTS "Authenticated users full access" ON public.deals_feed;
DROP POLICY IF EXISTS "Limited public preview" ON public.deals_feed;

-- Authenticated users can view all active deals
CREATE POLICY "Authenticated users view active deals"
ON public.deals_feed
FOR SELECT
TO authenticated
USING (is_active = true);

-- Anonymous users get limited preview (keep existing demo functionality)
CREATE POLICY "Anonymous limited preview"
ON public.deals_feed
FOR SELECT
TO anon
USING (
  is_active = true 
  AND id IN (
    SELECT deal_id FROM get_preview_deal_ids()
  )
);

-- ============================================================================
-- 5. Tighten market_insights policies - require authentication
-- ============================================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.market_insights;
DROP POLICY IF EXISTS "Authenticated users can view market insights" ON public.market_insights;

-- Authenticated users can view insights
CREATE POLICY "Authenticated users view market insights"
ON public.market_insights
FOR SELECT
TO authenticated
USING (true);

-- Authenticated users can insert insights
CREATE POLICY "Authenticated users insert market insights"
ON public.market_insights
FOR INSERT
TO authenticated
WITH CHECK (true);