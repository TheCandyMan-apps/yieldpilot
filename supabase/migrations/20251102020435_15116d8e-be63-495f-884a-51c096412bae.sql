-- Premium Features Monetization Schema

-- Premium data credits tracking
CREATE TABLE IF NOT EXISTS public.premium_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credit_type TEXT NOT NULL CHECK (credit_type IN ('premium_data', 'tenant_screening', 'marketplace_lead')),
  credits_remaining INTEGER NOT NULL DEFAULT 0,
  credits_total INTEGER NOT NULL DEFAULT 0,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Premium data query logs
CREATE TABLE IF NOT EXISTS public.premium_data_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  query_type TEXT NOT NULL CHECK (query_type IN ('ownership', 'zoning', 'demographics', 'planning')),
  credits_used INTEGER NOT NULL DEFAULT 1,
  data_result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Service providers for marketplace
CREATE TABLE IF NOT EXISTS public.service_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_type TEXT NOT NULL CHECK (provider_type IN ('broker', 'property_manager', 'mortgage_broker', 'solicitor', 'contractor')),
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  regions TEXT[] NOT NULL DEFAULT '{}',
  specializations TEXT[] DEFAULT '{}',
  rating NUMERIC(3,2) CHECK (rating >= 0 AND rating <= 5),
  review_count INTEGER DEFAULT 0,
  commission_rate NUMERIC(5,2),
  listing_tier TEXT DEFAULT 'basic' CHECK (listing_tier IN ('basic', 'featured', 'premium')),
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Referral tracking
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  referral_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'completed', 'cancelled')),
  commission_amount NUMERIC(10,2),
  commission_paid BOOLEAN DEFAULT false,
  user_rebate_amount NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enhanced portfolio metrics
CREATE TABLE IF NOT EXISTS public.portfolio_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  total_value NUMERIC(15,2),
  total_equity NUMERIC(15,2),
  total_debt NUMERIC(15,2),
  avg_yield NUMERIC(5,2),
  diversification_score INTEGER CHECK (diversification_score >= 0 AND diversification_score <= 100),
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
  geographic_concentration JSONB,
  property_type_mix JSONB,
  recommendations JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_premium_credits_user ON public.premium_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_queries_user ON public.premium_data_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_queries_listing ON public.premium_data_queries(listing_id);
CREATE INDEX IF NOT EXISTS idx_service_providers_type ON public.service_providers(provider_type);
CREATE INDEX IF NOT EXISTS idx_service_providers_regions ON public.service_providers USING GIN(regions);
CREATE INDEX IF NOT EXISTS idx_referrals_user ON public.referrals(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_provider ON public.referrals(provider_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_metrics_portfolio ON public.portfolio_metrics(portfolio_id);

-- RLS Policies
ALTER TABLE public.premium_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_data_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_metrics ENABLE ROW LEVEL SECURITY;

-- Premium credits policies
CREATE POLICY "Users can view own credits"
  ON public.premium_credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can manage credits"
  ON public.premium_credits FOR ALL
  USING (true)
  WITH CHECK (true);

-- Premium queries policies
CREATE POLICY "Users can view own queries"
  ON public.premium_data_queries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own queries"
  ON public.premium_data_queries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service providers policies
CREATE POLICY "Anyone can view active providers"
  ON public.service_providers FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service can manage providers"
  ON public.service_providers FOR ALL
  USING (true)
  WITH CHECK (true);

-- Referrals policies
CREATE POLICY "Users can view own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own referrals"
  ON public.referrals FOR UPDATE
  USING (auth.uid() = user_id);

-- Portfolio metrics policies
CREATE POLICY "Users can view own portfolio metrics"
  ON public.portfolio_metrics FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.portfolios
    WHERE portfolios.id = portfolio_metrics.portfolio_id
    AND portfolios.user_id = auth.uid()
  ));

CREATE POLICY "Service can manage portfolio metrics"
  ON public.portfolio_metrics FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_premium_credits_updated_at
  BEFORE UPDATE ON public.premium_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_providers_updated_at
  BEFORE UPDATE ON public.service_providers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();