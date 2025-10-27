-- Phase 3: Production-Ready Subscription Platform

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(stripe_subscription_id)
);

-- Create usage_counters table
CREATE TABLE IF NOT EXISTS public.usage_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  ingests_used INTEGER DEFAULT 0,
  exports_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, period_start)
);

-- Create saved_searches table
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  criteria JSONB NOT NULL DEFAULT '{}',
  frequency TEXT DEFAULT 'daily',
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create alerts_log table
CREATE TABLE IF NOT EXISTS public.alerts_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID REFERENCES public.saved_searches(id) ON DELETE CASCADE,
  matches_found INTEGER DEFAULT 0,
  executed_at TIMESTAMPTZ DEFAULT now()
);

-- Create orgs table
CREATE TABLE IF NOT EXISTS public.orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create org_members table
CREATE TABLE IF NOT EXISTS public.org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  invited_at TIMESTAMPTZ DEFAULT now(),
  joined_at TIMESTAMPTZ,
  UNIQUE(org_id, user_id)
);

-- Create feature_flags table
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add ranking columns to listing_metrics
ALTER TABLE public.listing_metrics 
  ADD COLUMN IF NOT EXISTS rank_score NUMERIC,
  ADD COLUMN IF NOT EXISTS factors JSONB;

-- Enable RLS on all new tables
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for usage_counters
CREATE POLICY "Users can view own usage"
  ON public.usage_counters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage usage"
  ON public.usage_counters FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for saved_searches
CREATE POLICY "Users can view own searches"
  ON public.saved_searches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own searches"
  ON public.saved_searches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own searches"
  ON public.saved_searches FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own searches"
  ON public.saved_searches FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for alerts_log
CREATE POLICY "Users can view logs for own searches"
  ON public.alerts_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.saved_searches
    WHERE saved_searches.id = alerts_log.search_id
    AND saved_searches.user_id = auth.uid()
  ));

CREATE POLICY "Service role can manage logs"
  ON public.alerts_log FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for orgs
CREATE POLICY "Users can view orgs they own or are members of"
  ON public.orgs FOR SELECT
  USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_members.org_id = orgs.id
      AND org_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create orgs"
  ON public.orgs FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their orgs"
  ON public.orgs FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their orgs"
  ON public.orgs FOR DELETE
  USING (auth.uid() = owner_id);

-- RLS Policies for org_members
CREATE POLICY "Users can view members of their orgs"
  ON public.org_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orgs
      WHERE orgs.id = org_members.org_id
      AND (orgs.owner_id = auth.uid() OR org_members.user_id = auth.uid())
    )
  );

CREATE POLICY "Org owners can manage members"
  ON public.org_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.orgs
      WHERE orgs.id = org_members.org_id
      AND orgs.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orgs
      WHERE orgs.id = org_members.org_id
      AND orgs.owner_id = auth.uid()
    )
  );

-- RLS Policies for feature_flags
CREATE POLICY "Everyone can view feature flags"
  ON public.feature_flags FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage feature flags"
  ON public.feature_flags FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_usage_counters_updated_at
  BEFORE UPDATE ON public.usage_counters
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_saved_searches_updated_at
  BEFORE UPDATE ON public.saved_searches
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_orgs_updated_at
  BEFORE UPDATE ON public.orgs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Insert default feature flags
INSERT INTO public.feature_flags (key, value, description) VALUES
  ('ranking_weights', '{"net_yield": 0.35, "dscr": 0.25, "cashflow_pm": 0.2, "epc": 0.1, "risk": 0.1}', 'Weights for deal ranking algorithm'),
  ('plan_limits', '{"free": {"ingests": 5, "exports": 2}, "starter": {"ingests": 50, "exports": 20}, "pro": {"ingests": 500, "exports": 200}, "team": {"ingests": -1, "exports": -1}}', 'Usage limits per subscription plan')
ON CONFLICT (key) DO NOTHING;