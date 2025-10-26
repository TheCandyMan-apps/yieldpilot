-- Create listings table for property data
CREATE TABLE IF NOT EXISTS public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  property_address text NOT NULL,
  price numeric NOT NULL,
  bedrooms integer,
  bathrooms integer,
  property_type text,
  listing_url text,
  image_url text,
  source text DEFAULT 'manual',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- RLS policies for listings
CREATE POLICY "Users can view own listings"
  ON public.listings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own listings"
  ON public.listings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own listings"
  ON public.listings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own listings"
  ON public.listings FOR DELETE
  USING (auth.uid() = user_id);

-- Create listing_metrics table for KPIs and assumptions
CREATE TABLE IF NOT EXISTS public.listing_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  assumptions jsonb DEFAULT jsonb_build_object(
    'deposit_pct', 25,
    'apr', 5.5,
    'term_years', 25,
    'interest_only', true,
    'voids_pct', 5,
    'maintenance_pct', 8,
    'management_pct', 10,
    'insurance_annual', 300
  ),
  kpis jsonb,
  score integer,
  drivers text[],
  risks text[],
  enrichment jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(listing_id)
);

-- Enable RLS
ALTER TABLE public.listing_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies for listing_metrics
CREATE POLICY "Users can view metrics for own listings"
  ON public.listing_metrics FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.listings
    WHERE listings.id = listing_metrics.listing_id
    AND listings.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert metrics for own listings"
  ON public.listing_metrics FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.listings
    WHERE listings.id = listing_metrics.listing_id
    AND listings.user_id = auth.uid()
  ));

CREATE POLICY "Users can update metrics for own listings"
  ON public.listing_metrics FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.listings
    WHERE listings.id = listing_metrics.listing_id
    AND listings.user_id = auth.uid()
  ));

-- Create indexes for performance
CREATE INDEX idx_listings_user_id ON public.listings(user_id);
CREATE INDEX idx_listing_metrics_listing_id ON public.listing_metrics(listing_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_listings_updated_at
    BEFORE UPDATE ON public.listings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_listing_metrics_updated_at
    BEFORE UPDATE ON public.listing_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();