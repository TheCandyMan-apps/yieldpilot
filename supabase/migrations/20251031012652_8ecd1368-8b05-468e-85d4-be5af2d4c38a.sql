-- Function to get regional yield comparison data using city
CREATE OR REPLACE FUNCTION public.get_global_yield_comparison()
RETURNS TABLE (
  country TEXT,
  avg_standard_yield NUMERIC,
  avg_adjusted_yield NUMERIC,
  yield_gap NUMERIC,
  deal_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(d.city, 'Unknown') as country,
    ROUND(AVG(COALESCE(d.yield_percentage, 0))::numeric, 2) as avg_standard_yield,
    ROUND(AVG(COALESCE(d.yield_percentage, 0) * 0.85)::numeric, 2) as avg_adjusted_yield,
    ROUND((AVG(COALESCE(d.yield_percentage, 0) * 0.85) - AVG(COALESCE(d.yield_percentage, 0)))::numeric, 2) as yield_gap,
    COUNT(DISTINCT d.id) as deal_count
  FROM public.deals_feed d
  WHERE d.is_active = true
    AND d.city IS NOT NULL
    AND d.yield_percentage IS NOT NULL
    AND d.yield_percentage > 0
  GROUP BY d.city
  HAVING COUNT(DISTINCT d.id) >= 3
  ORDER BY avg_adjusted_yield DESC
  LIMIT 10
$$;