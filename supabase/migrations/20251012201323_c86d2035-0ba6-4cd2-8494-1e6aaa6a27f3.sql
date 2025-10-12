-- Create enum for investment score ratings
CREATE TYPE public.investment_score AS ENUM ('A', 'B', 'C', 'D', 'E');

-- Create deals_feed table for property listings
CREATE TABLE public.deals_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_address TEXT NOT NULL,
  property_type property_type DEFAULT 'residential',
  price NUMERIC NOT NULL,
  estimated_rent NUMERIC,
  bedrooms INTEGER,
  bathrooms INTEGER,
  square_feet INTEGER,
  image_url TEXT,
  listing_url TEXT,
  location_lat NUMERIC,
  location_lng NUMERIC,
  postcode TEXT,
  city TEXT,
  yield_percentage NUMERIC,
  roi_percentage NUMERIC,
  cash_flow_monthly NUMERIC,
  investment_score investment_score,
  ai_summary TEXT,
  ai_recommendation TEXT,
  source TEXT DEFAULT 'manual',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create watchlist table
CREATE TABLE public.watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES public.deals_feed(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, deal_id)
);

-- Enable RLS
ALTER TABLE public.deals_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies for deals_feed (public read, admin write)
CREATE POLICY "Anyone can view active deals"
  ON public.deals_feed
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can view all deals"
  ON public.deals_feed
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for watchlist (user-specific)
CREATE POLICY "Users can view own watchlist"
  ON public.watchlist
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to own watchlist"
  ON public.watchlist
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from own watchlist"
  ON public.watchlist
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlist"
  ON public.watchlist
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_deals_feed_postcode ON public.deals_feed(postcode);
CREATE INDEX idx_deals_feed_city ON public.deals_feed(city);
CREATE INDEX idx_deals_feed_investment_score ON public.deals_feed(investment_score);
CREATE INDEX idx_deals_feed_yield ON public.deals_feed(yield_percentage);
CREATE INDEX idx_deals_feed_roi ON public.deals_feed(roi_percentage);
CREATE INDEX idx_watchlist_user_id ON public.watchlist(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_deals_feed_updated_at
  BEFORE UPDATE ON public.deals_feed
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();