-- Create user_roles table for team permissions
CREATE TYPE public.team_role AS ENUM ('owner', 'editor', 'viewer');

CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role team_role NOT NULL DEFAULT 'viewer',
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(portfolio_id, user_id)
);

-- Create property_comments table for collaboration
CREATE TABLE public.property_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES public.property_analyses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create deal_summaries table for AI-generated summaries
CREATE TABLE public.deal_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES public.deals_feed(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  risk_rating TEXT,
  recommendation TEXT,
  key_metrics JSONB,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create portfolio_performance table for tracking
CREATE TABLE public.portfolio_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_value NUMERIC NOT NULL,
  total_equity NUMERIC,
  total_debt NUMERIC,
  monthly_income NUMERIC,
  monthly_expenses NUMERIC,
  occupancy_rate NUMERIC,
  health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(portfolio_id, date)
);

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_performance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_members
CREATE POLICY "Users can view team members of their portfolios"
  ON public.team_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = team_members.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Portfolio owners can add team members"
  ON public.team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = team_members.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Portfolio owners can remove team members"
  ON public.team_members
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = team_members.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- RLS Policies for property_comments
CREATE POLICY "Users can view comments on accessible analyses"
  ON public.property_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.property_analyses
      WHERE property_analyses.id = property_comments.analysis_id
      AND property_analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create comments on accessible analyses"
  ON public.property_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.property_analyses
      WHERE property_analyses.id = property_comments.analysis_id
      AND property_analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own comments"
  ON public.property_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.property_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for deal_summaries
CREATE POLICY "Users can view own summaries"
  ON public.deal_summaries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own summaries"
  ON public.deal_summaries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own summaries"
  ON public.deal_summaries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own summaries"
  ON public.deal_summaries
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for portfolio_performance
CREATE POLICY "Users can view performance of their portfolios"
  ON public.portfolio_performance
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = portfolio_performance.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add performance data to their portfolios"
  ON public.portfolio_performance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = portfolio_performance.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_team_members_portfolio_id ON public.team_members(portfolio_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_property_comments_analysis_id ON public.property_comments(analysis_id);
CREATE INDEX idx_property_comments_user_id ON public.property_comments(user_id);
CREATE INDEX idx_deal_summaries_deal_id ON public.deal_summaries(deal_id);
CREATE INDEX idx_deal_summaries_user_id ON public.deal_summaries(user_id);
CREATE INDEX idx_portfolio_performance_portfolio_id ON public.portfolio_performance(portfolio_id);
CREATE INDEX idx_portfolio_performance_date ON public.portfolio_performance(date);

-- Triggers for updated_at
CREATE TRIGGER update_property_comments_updated_at
  BEFORE UPDATE ON public.property_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_deal_summaries_updated_at
  BEFORE UPDATE ON public.deal_summaries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();