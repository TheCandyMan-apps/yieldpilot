-- Create org_branding table for customizable report branding
CREATE TABLE IF NOT EXISTS public.org_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1a1a1a',
  accent_color TEXT DEFAULT '#8b5cf6',
  footer_text TEXT,
  watermark_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.org_branding ENABLE ROW LEVEL SECURITY;

-- Policies for org_branding
CREATE POLICY "Users can view branding for their org"
  ON public.org_branding FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_members.org_id = org_branding.org_id
      AND org_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own branding"
  ON public.org_branding FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create investor_reports_metadata table to track report generation and purchases
CREATE TABLE IF NOT EXISTS public.investor_reports_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.investor_reports(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content_hash TEXT NOT NULL,
  pdf_generated_at TIMESTAMPTZ,
  is_purchased BOOLEAN DEFAULT false,
  purchased_at TIMESTAMPTZ,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.investor_reports_metadata ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own report metadata"
  ON public.investor_reports_metadata FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can manage report metadata"
  ON public.investor_reports_metadata FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_org_branding_updated_at
  BEFORE UPDATE ON public.org_branding
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_investor_reports_metadata_updated_at
  BEFORE UPDATE ON public.investor_reports_metadata
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();