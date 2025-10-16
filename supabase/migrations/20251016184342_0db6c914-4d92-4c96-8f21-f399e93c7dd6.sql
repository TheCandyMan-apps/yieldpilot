-- Investor Profile & Preferences (Adaptive AI)
CREATE TABLE IF NOT EXISTS public.investor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_yield_min NUMERIC DEFAULT 6.0,
  preferred_yield_max NUMERIC DEFAULT 12.0,
  risk_tolerance TEXT DEFAULT 'moderate' CHECK (risk_tolerance IN ('low', 'moderate', 'high')),
  location_preferences JSONB DEFAULT '[]'::jsonb,
  property_types JSONB DEFAULT '["residential"]'::jsonb,
  refurb_comfort TEXT DEFAULT 'light' CHECK (refurb_comfort IN ('none', 'light', 'moderate', 'heavy')),
  max_budget NUMERIC,
  min_bedrooms INTEGER DEFAULT 1,
  investment_strategy TEXT DEFAULT 'buy_to_let' CHECK (investment_strategy IN ('buy_to_let', 'brrr', 'flip', 'hmo', 'serviced_accommodation')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- AI Learning Engine (tracks user behavior to personalize)
CREATE TABLE IF NOT EXISTS public.deal_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals_feed(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('viewed', 'saved', 'rejected', 'shared', 'analyzed')),
  interaction_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Area Insights & Predictive Growth
CREATE TABLE IF NOT EXISTS public.area_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  postcode_prefix TEXT NOT NULL,
  city TEXT NOT NULL,
  avg_yield_current NUMERIC,
  avg_price_current NUMERIC,
  price_growth_1yr NUMERIC,
  price_growth_5yr_forecast NUMERIC,
  rental_growth_1yr NUMERIC,
  transaction_volume INTEGER,
  days_on_market_avg INTEGER,
  opportunity_score INTEGER CHECK (opportunity_score BETWEEN 0 AND 100),
  market_gap_indicator TEXT,
  data_date DATE DEFAULT CURRENT_DATE,
  confidence_score NUMERIC DEFAULT 0.75,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(postcode_prefix, data_date)
);

-- Renovation Estimates (mock data ready)
CREATE TABLE IF NOT EXISTS public.renovation_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals_feed(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  condition_score INTEGER CHECK (condition_score BETWEEN 1 AND 10),
  estimated_cost_min NUMERIC,
  estimated_cost_max NUMERIC,
  post_refurb_value NUMERIC,
  potential_rent_increase NUMERIC,
  epc_current TEXT,
  epc_potential TEXT,
  epc_upgrade_cost NUMERIC,
  recommendations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Generated Reports
CREATE TABLE IF NOT EXISTS public.investor_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals_feed(id) ON DELETE CASCADE,
  report_type TEXT DEFAULT 'deal_analysis' CHECK (report_type IN ('deal_analysis', 'portfolio_summary', 'market_insights', 'custom')),
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  pdf_url TEXT,
  is_branded BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolio Properties (enhanced)
CREATE TABLE IF NOT EXISTS public.portfolio_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_address TEXT NOT NULL,
  purchase_price NUMERIC NOT NULL,
  purchase_date DATE,
  current_value NUMERIC,
  mortgage_balance NUMERIC,
  monthly_rent NUMERIC,
  monthly_costs NUMERIC,
  property_type property_type DEFAULT 'residential',
  epc_rating TEXT,
  bedrooms INTEGER,
  imported_from_analysis_id UUID REFERENCES property_analyses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Finance Products Cache (for live integrations later)
CREATE TABLE IF NOT EXISTS public.finance_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  lender TEXT NOT NULL,
  interest_rate NUMERIC NOT NULL,
  product_type TEXT CHECK (product_type IN ('residential_btl', 'limited_company', 'bridging', 'refurb')),
  ltv_max NUMERIC,
  min_loan NUMERIC,
  max_loan NUMERIC,
  fees JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.investor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.area_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renovation_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for investor_profiles
CREATE POLICY "Users can view own profile" ON public.investor_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.investor_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.investor_profiles FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for deal_interactions
CREATE POLICY "Users can view own interactions" ON public.deal_interactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own interactions" ON public.deal_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for area_analytics (public read)
CREATE POLICY "Anyone can view area analytics" ON public.area_analytics FOR SELECT USING (true);

-- RLS Policies for renovation_estimates
CREATE POLICY "Users can view own estimates" ON public.renovation_estimates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own estimates" ON public.renovation_estimates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own estimates" ON public.renovation_estimates FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for investor_reports
CREATE POLICY "Users can view own reports" ON public.investor_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reports" ON public.investor_reports FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for portfolio_holdings
CREATE POLICY "Users can view own holdings" ON public.portfolio_holdings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own holdings" ON public.portfolio_holdings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own holdings" ON public.portfolio_holdings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own holdings" ON public.portfolio_holdings FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for finance_products (public read)
CREATE POLICY "Anyone can view active finance products" ON public.finance_products FOR SELECT USING (is_active = true);

-- Triggers for updated_at
CREATE TRIGGER update_investor_profiles_updated_at BEFORE UPDATE ON public.investor_profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_area_analytics_updated_at BEFORE UPDATE ON public.area_analytics FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_portfolio_holdings_updated_at BEFORE UPDATE ON public.portfolio_holdings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_finance_products_updated_at BEFORE UPDATE ON public.finance_products FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Indexes for performance
CREATE INDEX idx_investor_profiles_user_id ON public.investor_profiles(user_id);
CREATE INDEX idx_deal_interactions_user_id ON public.deal_interactions(user_id);
CREATE INDEX idx_deal_interactions_deal_id ON public.deal_interactions(deal_id);
CREATE INDEX idx_area_analytics_postcode ON public.area_analytics(postcode_prefix);
CREATE INDEX idx_area_analytics_city ON public.area_analytics(city);
CREATE INDEX idx_renovation_estimates_deal_id ON public.renovation_estimates(deal_id);
CREATE INDEX idx_investor_reports_user_id ON public.investor_reports(user_id);
CREATE INDEX idx_portfolio_holdings_user_id ON public.portfolio_holdings(user_id);