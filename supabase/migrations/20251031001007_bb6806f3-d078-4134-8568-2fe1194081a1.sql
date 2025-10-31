-- Drop existing tables if they exist (clean slate)
DROP TABLE IF EXISTS public.api_usage CASCADE;
DROP TABLE IF EXISTS public.api_keys CASCADE;
DROP TABLE IF EXISTS public.metered_usage CASCADE;
DROP TABLE IF EXISTS public.admin_audit_logs CASCADE;

-- API Keys & Metered Billing Tables
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz,
  rate_limit_per_min int DEFAULT 60
);

CREATE TABLE public.api_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  method text NOT NULL,
  status_code int NOT NULL,
  response_time_ms int,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

CREATE TABLE public.metered_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_type text NOT NULL,
  quantity int DEFAULT 1,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  period_month date NOT NULL DEFAULT date_trunc('month', now())
);

CREATE TABLE public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  changes jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX idx_api_usage_api_key_id ON public.api_usage(api_key_id);
CREATE INDEX idx_api_usage_created_at ON public.api_usage(created_at DESC);
CREATE INDEX idx_metered_usage_user_period ON public.metered_usage(user_id, period_month);
CREATE INDEX idx_admin_audit_logs_admin_user ON public.admin_audit_logs(admin_user_id, created_at DESC);

-- RLS Policies
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metered_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own API keys" ON public.api_keys FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own API usage" ON public.api_usage FOR SELECT USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.api_keys WHERE api_keys.id = api_usage.api_key_id AND api_keys.user_id = auth.uid()));
CREATE POLICY "Service can insert API usage" ON public.api_usage FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own metered usage" ON public.metered_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can insert metered usage" ON public.metered_usage FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service can insert admin audit logs" ON public.admin_audit_logs FOR INSERT WITH CHECK (true);