-- Phase 4: Add CapEx Templates, Portfolios, Compliance
-- ============================================================

-- 1) CapEx Templates for renovation cost modeling
CREATE TABLE IF NOT EXISTS public.capex_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.capex_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own capex templates"
  ON public.capex_templates FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own capex templates"
  ON public.capex_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own capex templates"
  ON public.capex_templates FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own capex templates"
  ON public.capex_templates FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_capex_templates_user ON public.capex_templates(user_id);

-- 2) Extend listing_metrics for CapEx data
ALTER TABLE public.listing_metrics 
  ADD COLUMN IF NOT EXISTS capex_total NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS capex_breakdown JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS capex_annual_reserve NUMERIC DEFAULT 0;

-- 3) Portfolios (already exists, but ensure org_id support)
ALTER TABLE public.portfolios 
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_portfolios_org ON public.portfolios(org_id);

-- 4) Portfolio Items (link portfolios to listings)
CREATE TABLE IF NOT EXISTS public.portfolio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(portfolio_id, listing_id)
);

ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view portfolio items for own portfolios"
  ON public.portfolio_items FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.portfolios
    WHERE portfolios.id = portfolio_items.portfolio_id
    AND portfolios.user_id = auth.uid()
  ));

CREATE POLICY "Users can add items to own portfolios"
  ON public.portfolio_items FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.portfolios
    WHERE portfolios.id = portfolio_items.portfolio_id
    AND portfolios.user_id = auth.uid()
  ));

CREATE POLICY "Users can remove items from own portfolios"
  ON public.portfolio_items FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.portfolios
    WHERE portfolios.id = portfolio_items.portfolio_id
    AND portfolios.user_id = auth.uid()
  ));

CREATE INDEX idx_portfolio_items_portfolio ON public.portfolio_items(portfolio_id);
CREATE INDEX idx_portfolio_items_listing ON public.portfolio_items(listing_id);

-- 5) Compliance Checks
CREATE TABLE IF NOT EXISTS public.compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  check_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pass', 'warn', 'fail')),
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT,
  action_required TEXT,
  checked_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.compliance_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view compliance for own listings"
  ON public.compliance_checks FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.listings
    WHERE listings.id = compliance_checks.listing_id
    AND listings.user_id = auth.uid()
  ));

CREATE INDEX idx_compliance_checks_listing ON public.compliance_checks(listing_id);
CREATE INDEX idx_compliance_checks_status ON public.compliance_checks(status);

-- 6) Copilot Chat History
CREATE TABLE IF NOT EXISTS public.copilot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  context_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.copilot_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own copilot conversations"
  ON public.copilot_conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own copilot conversations"
  ON public.copilot_conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own copilot conversations"
  ON public.copilot_conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_copilot_conversations_user ON public.copilot_conversations(user_id);
CREATE INDEX idx_copilot_conversations_listing ON public.copilot_conversations(listing_id);

-- 7) Scenario Analysis Results
CREATE TABLE IF NOT EXISTS public.scenario_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  parameters JSONB NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.scenario_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scenario runs"
  ON public.scenario_runs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own scenario runs"
  ON public.scenario_runs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_scenario_runs_portfolio ON public.scenario_runs(portfolio_id);
CREATE INDEX idx_scenario_runs_user ON public.scenario_runs(user_id);

-- 8) Add updated_at triggers
CREATE TRIGGER update_capex_templates_updated_at
  BEFORE UPDATE ON public.capex_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_copilot_conversations_updated_at
  BEFORE UPDATE ON public.copilot_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();