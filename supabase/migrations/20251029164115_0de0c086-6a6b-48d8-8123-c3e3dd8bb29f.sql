-- Create offmarket_leads if missing
CREATE TABLE IF NOT EXISTS public.offmarket_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address_line1 TEXT NOT NULL,
  postcode TEXT NOT NULL,
  city TEXT,
  region TEXT NOT NULL,
  property_type TEXT,
  bedrooms INTEGER,
  estimated_value NUMERIC,
  currency TEXT NOT NULL DEFAULT 'GBP',
  lead_source TEXT NOT NULL,
  lead_score NUMERIC NOT NULL DEFAULT 0,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure trigger exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_offmarket_leads_updated_at'
  ) THEN
    CREATE TRIGGER trg_offmarket_leads_updated_at
    BEFORE UPDATE ON public.offmarket_leads
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- RLS: block direct access (reads come via backend function with service key)
ALTER TABLE public.offmarket_leads ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='offmarket_leads' AND policyname='offmarket_leads_no_direct_select'
  ) THEN
    CREATE POLICY "offmarket_leads_no_direct_select" ON public.offmarket_leads
    FOR SELECT USING (false);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='offmarket_leads' AND policyname='offmarket_leads_no_direct_modify'
  ) THEN
    CREATE POLICY "offmarket_leads_no_direct_modify" ON public.offmarket_leads
    FOR ALL USING (false) WITH CHECK (false);
  END IF;
END $$;

-- Create regional_benchmarks with upsert-friendly unique constraint
CREATE TABLE IF NOT EXISTS public.regional_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region TEXT NOT NULL,
  postcode_prefix TEXT,
  property_type TEXT,
  data_date DATE NOT NULL,
  sample_size INTEGER NOT NULL,
  avg_yield NUMERIC,
  median_yield NUMERIC,
  p10_yield NUMERIC,
  p90_yield NUMERIC,
  avg_price NUMERIC,
  currency TEXT NOT NULL DEFAULT 'GBP',
  confidence_level NUMERIC,
  postcode_prefix_norm TEXT GENERATED ALWAYS AS (COALESCE(postcode_prefix, '')) STORED,
  property_type_norm TEXT GENERATED ALWAYS AS (COALESCE(property_type, '')) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT regional_benchmarks_unique_norm UNIQUE (region, data_date, postcode_prefix_norm, property_type_norm)
);

-- Ensure trigger exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_regional_benchmarks_updated_at'
  ) THEN
    CREATE TRIGGER trg_regional_benchmarks_updated_at
    BEFORE UPDATE ON public.regional_benchmarks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

ALTER TABLE public.regional_benchmarks ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='regional_benchmarks' AND policyname='regional_benchmarks_no_direct_select'
  ) THEN
    CREATE POLICY "regional_benchmarks_no_direct_select" ON public.regional_benchmarks
    FOR SELECT USING (false);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='regional_benchmarks' AND policyname='regional_benchmarks_no_direct_modify'
  ) THEN
    CREATE POLICY "regional_benchmarks_no_direct_modify" ON public.regional_benchmarks
    FOR ALL USING (false) WITH CHECK (false);
  END IF;
END $$;

-- Seed demo data
INSERT INTO public.regional_benchmarks (
  region, postcode_prefix, property_type, data_date, sample_size, avg_yield, median_yield, p10_yield, p90_yield, avg_price, currency, confidence_level
) VALUES (
  'GB', NULL, NULL, CURRENT_DATE, 240, 5.2, 5.0, 3.1, 7.8, 325000, 'GBP', 0.90
)
ON CONFLICT (region, data_date, postcode_prefix_norm, property_type_norm) DO NOTHING;

INSERT INTO public.offmarket_leads (
  address_line1, postcode, city, region, property_type, bedrooms, estimated_value, currency, lead_source, lead_score, discovered_at, status, expires_at
) VALUES
('12 Market Street', 'SW1A 1AA', 'London', 'UK', 'Terraced', 3, 650000, 'GBP', 'auction', 78, now() - interval '2 days', 'active', now() + interval '20 days'),
('Flat 4, 22 King Road', 'M1 2AB', 'Manchester', 'UK', 'Flat', 2, 285000, 'GBP', 'withdrawn', 66, now() - interval '5 days', 'active', now() + interval '25 days')
ON CONFLICT DO NOTHING;