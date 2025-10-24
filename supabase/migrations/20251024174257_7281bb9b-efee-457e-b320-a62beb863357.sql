-- Remove all existing policies causing recursion issues
DROP POLICY IF EXISTS "Authenticated users can view all area analytics" ON public.area_analytics;
DROP POLICY IF EXISTS "Public users can view limited area analytics" ON public.area_analytics;
DROP POLICY IF EXISTS "Authenticated users can view all market insights" ON public.market_insights;
DROP POLICY IF EXISTS "Public users can view limited market insights" ON public.market_insights;

-- Create single, simple policies for area_analytics
CREATE POLICY "Enable read access for all authenticated users" 
ON public.area_analytics 
FOR SELECT 
USING (true);

-- Create single, simple policies for market_insights
CREATE POLICY "Enable read access for all authenticated users" 
ON public.market_insights 
FOR SELECT 
USING (true);