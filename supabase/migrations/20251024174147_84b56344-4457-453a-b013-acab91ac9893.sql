-- Fix infinite recursion in area_analytics and market_insights RLS policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view area analytics" ON public.area_analytics;
DROP POLICY IF EXISTS "Users can view market insights" ON public.market_insights;
DROP POLICY IF EXISTS "Users can insert area analytics" ON public.area_analytics;
DROP POLICY IF EXISTS "Users can insert market insights" ON public.market_insights;

-- Create simple, non-recursive policies for area_analytics
CREATE POLICY "Authenticated users can view area analytics" 
ON public.area_analytics 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert area analytics" 
ON public.area_analytics 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Create simple, non-recursive policies for market_insights
CREATE POLICY "Authenticated users can view market insights" 
ON public.market_insights 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert market insights" 
ON public.market_insights 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);