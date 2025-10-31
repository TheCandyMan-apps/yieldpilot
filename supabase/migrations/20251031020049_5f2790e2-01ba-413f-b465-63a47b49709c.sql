-- Lease Intelligence Module Tables

-- Lease scan jobs to track PDF processing
CREATE TABLE IF NOT EXISTS public.lease_scan_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.deals_feed(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lease terms extracted from documents
CREATE TABLE IF NOT EXISTS public.lease_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_job_id UUID NOT NULL REFERENCES public.lease_scan_jobs(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.deals_feed(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Core lease information
  lease_start_date DATE,
  lease_end_date DATE,
  years_remaining INTEGER,
  ground_rent_annual NUMERIC,
  ground_rent_review_period INTEGER,
  ground_rent_escalation_type TEXT, -- 'fixed', 'rpi', 'doubling', 'custom'
  service_charge_annual NUMERIC,
  
  -- Key restrictions and clauses
  subletting_allowed BOOLEAN DEFAULT true,
  subletting_restrictions TEXT,
  pet_clause TEXT,
  alteration_restrictions TEXT,
  use_restrictions TEXT,
  
  -- Financial obligations
  insurance_responsibility TEXT, -- 'landlord', 'tenant', 'shared'
  repair_obligations TEXT,
  
  -- Extracted raw data
  raw_extracted_data JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Risk flags identified during analysis
CREATE TABLE IF NOT EXISTS public.lease_risk_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_term_id UUID NOT NULL REFERENCES public.lease_terms(id) ON DELETE CASCADE,
  
  risk_type TEXT NOT NULL, -- 'ground_rent', 'lease_length', 'restrictions', 'mortgageability', 'service_charge'
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  impact_on_value NUMERIC, -- estimated % impact on property value
  remediation_cost NUMERIC,
  remediation_advice TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lease risk scores and metrics
CREATE TABLE IF NOT EXISTS public.lease_roi_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_term_id UUID NOT NULL REFERENCES public.lease_terms(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.deals_feed(id) ON DELETE SET NULL,
  
  -- Risk scoring
  overall_risk_score TEXT NOT NULL CHECK (overall_risk_score IN ('A', 'B', 'C', 'D', 'E', 'F')),
  risk_score_numeric INTEGER NOT NULL CHECK (risk_score_numeric BETWEEN 0 AND 100),
  
  -- Specific risk categories (0-100 scale)
  ground_rent_risk_score INTEGER DEFAULT 0,
  lease_length_risk_score INTEGER DEFAULT 0,
  restrictions_risk_score INTEGER DEFAULT 0,
  mortgageability_risk_score INTEGER DEFAULT 0,
  service_charge_risk_score INTEGER DEFAULT 0,
  
  -- Financial impact
  adjusted_roi_percentage NUMERIC,
  roi_adjustment_percentage NUMERIC, -- how much the lease issues reduce ROI
  estimated_value_impact NUMERIC,
  
  -- Mortgageability
  is_mortgageable BOOLEAN DEFAULT true,
  mortgageability_notes TEXT,
  
  -- Enfranchisement estimates
  enfranchisement_eligible BOOLEAN DEFAULT false,
  estimated_enfranchisement_cost NUMERIC,
  lease_extension_cost_estimate NUMERIC,
  
  -- Ground rent projections (10-year forecast)
  ground_rent_forecast JSONB DEFAULT '[]'::jsonb,
  service_charge_forecast JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lease_scan_jobs_user_id ON public.lease_scan_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_lease_scan_jobs_status ON public.lease_scan_jobs(status);
CREATE INDEX IF NOT EXISTS idx_lease_terms_user_id ON public.lease_terms(user_id);
CREATE INDEX IF NOT EXISTS idx_lease_terms_property_id ON public.lease_terms(property_id);
CREATE INDEX IF NOT EXISTS idx_lease_risk_flags_lease_term_id ON public.lease_risk_flags(lease_term_id);
CREATE INDEX IF NOT EXISTS idx_lease_risk_flags_severity ON public.lease_risk_flags(severity);
CREATE INDEX IF NOT EXISTS idx_lease_roi_metrics_lease_term_id ON public.lease_roi_metrics(lease_term_id);

-- RLS Policies
ALTER TABLE public.lease_scan_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lease_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lease_risk_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lease_roi_metrics ENABLE ROW LEVEL SECURITY;

-- Users can manage their own lease scan jobs
CREATE POLICY "Users can manage own lease scan jobs" ON public.lease_scan_jobs
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can manage their own lease terms
CREATE POLICY "Users can manage own lease terms" ON public.lease_terms
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can view risk flags for their leases
CREATE POLICY "Users can view own lease risk flags" ON public.lease_risk_flags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.lease_terms
      WHERE lease_terms.id = lease_risk_flags.lease_term_id
      AND lease_terms.user_id = auth.uid()
    )
  );

-- Service can insert risk flags
CREATE POLICY "Service can insert risk flags" ON public.lease_risk_flags
  FOR INSERT WITH CHECK (true);

-- Users can view their own lease metrics
CREATE POLICY "Users can view own lease metrics" ON public.lease_roi_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.lease_terms
      WHERE lease_terms.id = lease_roi_metrics.lease_term_id
      AND lease_terms.user_id = auth.uid()
    )
  );

-- Service can insert/update lease metrics
CREATE POLICY "Service can manage lease metrics" ON public.lease_roi_metrics
  FOR ALL USING (true)
  WITH CHECK (true);

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_lease_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lease_scan_jobs_updated_at
  BEFORE UPDATE ON public.lease_scan_jobs
  FOR EACH ROW EXECUTE FUNCTION update_lease_updated_at();

CREATE TRIGGER update_lease_terms_updated_at
  BEFORE UPDATE ON public.lease_terms
  FOR EACH ROW EXECUTE FUNCTION update_lease_updated_at();

CREATE TRIGGER update_lease_roi_metrics_updated_at
  BEFORE UPDATE ON public.lease_roi_metrics
  FOR EACH ROW EXECUTE FUNCTION update_lease_updated_at();