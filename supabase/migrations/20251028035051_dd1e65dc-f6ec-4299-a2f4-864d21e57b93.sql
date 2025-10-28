-- Create deal syndicates table for co-investment
CREATE TABLE IF NOT EXISTS public.deal_syndicates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  lead_investor_id UUID NOT NULL,
  total_equity NUMERIC NOT NULL DEFAULT 100,
  status TEXT NOT NULL CHECK (status IN ('forming', 'active', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create syndicate members table  
CREATE TABLE IF NOT EXISTS public.syndicate_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  syndicate_id UUID NOT NULL REFERENCES public.deal_syndicates(id) ON DELETE CASCADE,
  investor_id UUID,
  invite_email TEXT,
  equity_percentage NUMERIC NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('invited', 'confirmed', 'declined')),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  confirmed_at TIMESTAMP WITH TIME ZONE
);

-- Create user activity tracking table
CREATE TABLE IF NOT EXISTS public.user_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deal_syndicates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syndicate_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- RLS policies for deal_syndicates
CREATE POLICY "Users can create syndicates"
  ON public.deal_syndicates FOR INSERT
  WITH CHECK (auth.uid() = lead_investor_id);

CREATE POLICY "Users can view syndicates they're part of"
  ON public.deal_syndicates FOR SELECT
  USING (
    auth.uid() = lead_investor_id OR
    EXISTS (
      SELECT 1 FROM public.syndicate_members
      WHERE syndicate_id = deal_syndicates.id
      AND investor_id = auth.uid()
    )
  );

-- RLS policies for syndicate_members
CREATE POLICY "Members can view syndicate membership"
  ON public.syndicate_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.deal_syndicates
      WHERE id = syndicate_members.syndicate_id
      AND (lead_investor_id = auth.uid() OR syndicate_members.investor_id = auth.uid())
    )
  );

CREATE POLICY "Lead investors can manage members"
  ON public.syndicate_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.deal_syndicates
      WHERE id = syndicate_members.syndicate_id
      AND lead_investor_id = auth.uid()
    )
  );

-- RLS policies for user_activity
CREATE POLICY "Users can view own activity"
  ON public.user_activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert activity"
  ON public.user_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_deal_syndicates_lead ON public.deal_syndicates(lead_investor_id);
CREATE INDEX IF NOT EXISTS idx_syndicate_members_investor ON public.syndicate_members(investor_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_created ON public.user_activity(user_id, created_at DESC);