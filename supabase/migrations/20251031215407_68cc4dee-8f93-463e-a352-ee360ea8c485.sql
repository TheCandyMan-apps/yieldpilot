-- User entitlements table for subscription management
CREATE TABLE IF NOT EXISTS public.user_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  expires_at TIMESTAMPTZ,
  features JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;

-- Users can read their own entitlements
CREATE POLICY "Users can view own entitlements" ON public.user_entitlements
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role can write entitlements (via webhooks)
CREATE POLICY "Service role can manage entitlements" ON public.user_entitlements
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- View for active entitlements
CREATE OR REPLACE VIEW public.v_user_entitlements AS
SELECT 
  ue.user_id,
  COALESCE(ue.plan, 'free') as plan,
  ue.features,
  ue.expires_at,
  CASE 
    WHEN ue.expires_at IS NULL THEN true
    WHEN ue.expires_at > now() THEN true
    ELSE false
  END as is_active
FROM public.user_entitlements ue
WHERE ue.expires_at IS NULL OR ue.expires_at > now();

-- Org-based RLS for deals_feed (if org_id exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deals_feed' AND column_name = 'org_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.deals_feed ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "org_read_deals" ON public.deals_feed';
    EXECUTE 'CREATE POLICY "org_read_deals" ON public.deals_feed FOR SELECT USING (org_id IS NULL OR org_id::text = (auth.jwt()->''org_id'')::text OR auth.uid() IS NOT NULL)';
  END IF;
END $$;

-- Update trigger for entitlements
CREATE TRIGGER update_entitlements_updated_at
  BEFORE UPDATE ON public.user_entitlements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check entitlement
CREATE OR REPLACE FUNCTION public.has_entitlement(_user_id UUID, _feature TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_entitlements
    WHERE user_id = _user_id
    AND (expires_at IS NULL OR expires_at > now())
    AND (
      features ? _feature
      OR plan IN ('pro', 'investor', 'deal_lab')
    )
  )
$$;

-- One-time purchases table
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_type TEXT NOT NULL,
  stripe_payment_intent_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases" ON public.purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage purchases" ON public.purchases
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');