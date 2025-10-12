-- Create alerts table for user-defined investment alerts
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('roi', 'yield', 'price', 'location')),
  min_roi NUMERIC,
  min_yield NUMERIC,
  max_price NUMERIC,
  min_price NUMERIC,
  location_filter TEXT,
  property_type property_type,
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create alert_matches table to track triggered alerts
CREATE TABLE public.alert_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES public.deals_feed(id) ON DELETE CASCADE,
  matched_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_read BOOLEAN DEFAULT false,
  UNIQUE(alert_id, deal_id)
);

-- Create market_insights table for regional data
CREATE TABLE public.market_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  postcode_prefix TEXT,
  avg_price NUMERIC,
  avg_rent NUMERIC,
  avg_yield NUMERIC,
  avg_roi NUMERIC,
  growth_forecast_1yr NUMERIC,
  growth_forecast_5yr NUMERIC,
  sample_size INTEGER DEFAULT 0,
  data_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(city, postcode_prefix, data_date)
);

-- Enable RLS
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for alerts
CREATE POLICY "Users can view own alerts"
  ON public.alerts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own alerts"
  ON public.alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
  ON public.alerts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts"
  ON public.alerts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for alert_matches
CREATE POLICY "Users can view own alert matches"
  ON public.alert_matches
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.alerts
      WHERE alerts.id = alert_matches.alert_id
      AND alerts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own alert matches"
  ON public.alert_matches
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.alerts
      WHERE alerts.id = alert_matches.alert_id
      AND alerts.user_id = auth.uid()
    )
  );

-- RLS Policies for market_insights (public read)
CREATE POLICY "Anyone can view market insights"
  ON public.market_insights
  FOR SELECT
  USING (true);

-- Create indexes
CREATE INDEX idx_alerts_user_id ON public.alerts(user_id);
CREATE INDEX idx_alerts_active ON public.alerts(is_active);
CREATE INDEX idx_alert_matches_alert_id ON public.alert_matches(alert_id);
CREATE INDEX idx_alert_matches_deal_id ON public.alert_matches(deal_id);
CREATE INDEX idx_alert_matches_read ON public.alert_matches(is_read);
CREATE INDEX idx_market_insights_city ON public.market_insights(city);
CREATE INDEX idx_market_insights_postcode ON public.market_insights(postcode_prefix);
CREATE INDEX idx_market_insights_date ON public.market_insights(data_date);

-- Triggers for updated_at
CREATE TRIGGER update_alerts_updated_at
  BEFORE UPDATE ON public.alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_market_insights_updated_at
  BEFORE UPDATE ON public.market_insights
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();