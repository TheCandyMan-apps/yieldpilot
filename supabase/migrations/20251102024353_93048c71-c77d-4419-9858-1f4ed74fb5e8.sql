-- Create v_investor_deals view for map search
CREATE OR REPLACE VIEW v_investor_deals AS
SELECT 
  l.id,
  l.user_id,
  l.address_line1,
  l.city,
  l.postcode,
  l.region,
  l.country_code,
  l.location_lat as latitude,
  l.location_lng as longitude,
  l.price,
  l.currency,
  l.bedrooms,
  l.bathrooms,
  l.property_type,
  l.listing_url,
  l.image_url,
  l.is_active,
  l.created_at,
  l.updated_at,
  lm.gross_yield_pct,
  lm.net_yield_pct,
  lm.score,
  lm.kpis,
  lm.enrichment
FROM listings l
LEFT JOIN listing_metrics lm ON l.id = lm.listing_id
WHERE l.is_active = true
  AND l.location_lat IS NOT NULL
  AND l.location_lng IS NOT NULL;

-- Grant select permission on the view
GRANT SELECT ON v_investor_deals TO authenticated;
GRANT SELECT ON v_investor_deals TO anon;