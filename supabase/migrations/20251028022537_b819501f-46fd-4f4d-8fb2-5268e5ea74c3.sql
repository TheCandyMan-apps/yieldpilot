-- Phase 5: Global Expansion Schema

-- 1. Extend listings for multi-region support
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'UK',
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'GBP',
ADD COLUMN IF NOT EXISTS address_line1 TEXT,
ADD COLUMN IF NOT EXISTS address_town TEXT,
ADD COLUMN IF NOT EXISTS postcode TEXT,
ADD COLUMN IF NOT EXISTS location_lat NUMERIC,
ADD COLUMN IF NOT EXISTS location_lng NUMERIC,
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS source_refs JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Extend listing_metrics for global finance
ALTER TABLE listing_metrics
ADD COLUMN IF NOT EXISTS gross_yield_pct NUMERIC,
ADD COLUMN IF NOT EXISTS net_yield_pct NUMERIC,
ADD COLUMN IF NOT EXISTS fx_rate NUMERIC DEFAULT 1.0;

-- 3. Foreign exchange rates table
CREATE TABLE IF NOT EXISTS fx_rates (
  base TEXT NOT NULL,
  target TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (base, target)
);

-- 4. Regional mortgage rates table
CREATE TABLE IF NOT EXISTS mortgage_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region TEXT NOT NULL,
  lender TEXT,
  product_type TEXT,
  ltv_max NUMERIC,
  interest_rate NUMERIC NOT NULL,
  term_years INTEGER,
  fees JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Regional tax/cost parameters
CREATE TABLE IF NOT EXISTS regional_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region TEXT NOT NULL UNIQUE,
  currency TEXT NOT NULL,
  property_tax_pct NUMERIC DEFAULT 1.0,
  maintenance_pct NUMERIC DEFAULT 1.0,
  insurance_pct NUMERIC DEFAULT 0.4,
  mortgage_interest_deductible BOOLEAN DEFAULT false,
  stamp_duty_rates JSONB DEFAULT '[]'::jsonb,
  closing_costs_pct NUMERIC DEFAULT 0,
  locale TEXT DEFAULT 'en-GB',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. API keys for partner integrations
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT UNIQUE NOT NULL,
  name TEXT,
  scopes TEXT[] DEFAULT ARRAY['read:deals']::TEXT[],
  rate_limit INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE fx_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE mortgage_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE regional_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fx_rates
CREATE POLICY "Anyone can view FX rates"
  ON fx_rates FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage FX rates"
  ON fx_rates FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for mortgage_rates
CREATE POLICY "Anyone can view active mortgage rates"
  ON mortgage_rates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service role can manage mortgage rates"
  ON mortgage_rates FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for regional_parameters
CREATE POLICY "Anyone can view regional parameters"
  ON regional_parameters FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage regional parameters"
  ON regional_parameters FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for api_keys
CREATE POLICY "Users can view own API keys"
  ON api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own API keys"
  ON api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys"
  ON api_keys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys"
  ON api_keys FOR DELETE
  USING (auth.uid() = user_id);

-- Insert default regional parameters
INSERT INTO regional_parameters (region, currency, property_tax_pct, maintenance_pct, insurance_pct, mortgage_interest_deductible, stamp_duty_rates, closing_costs_pct, locale)
VALUES 
  ('UK', 'GBP', 0.9, 1.0, 0.4, false, 
   '[{"threshold":0,"rate":0},{"threshold":250000,"rate":5},{"threshold":925000,"rate":10},{"threshold":1500000,"rate":12}]'::jsonb, 
   1.5, 'en-GB'),
  ('US', 'USD', 1.5, 0.8, 0.5, true, '[]'::jsonb, 2.5, 'en-US'),
  ('DE', 'EUR', 1.0, 1.2, 0.3, false, '[]'::jsonb, 8.5, 'de-DE'),
  ('FR', 'EUR', 1.2, 1.0, 0.3, false, '[]'::jsonb, 7.5, 'fr-FR'),
  ('ES', 'EUR', 0.8, 1.0, 0.3, false, '[]'::jsonb, 10.0, 'es-ES')
ON CONFLICT (region) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_listings_region ON listings(region) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_fx_rates_lookup ON fx_rates(base, target);
CREATE INDEX IF NOT EXISTS idx_mortgage_rates_region ON mortgage_rates(region) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key) WHERE is_active = true;