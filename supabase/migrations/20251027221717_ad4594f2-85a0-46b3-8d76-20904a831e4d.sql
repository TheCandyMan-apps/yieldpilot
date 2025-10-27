-- Create user roles system (avoiding privilege escalation)
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles: users see their own, admins see all
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage all roles"
ON public.user_roles FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create ingestion job queue
CREATE TABLE public.ingest_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site TEXT NOT NULL CHECK (site IN ('zoopla', 'rightmove')),
  input_url TEXT NOT NULL,
  normalized_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'no_items', 'canceled')) DEFAULT 'queued',
  run_id TEXT,
  dataset_id TEXT,
  listing_id UUID REFERENCES public.listings(id),
  error JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.ingest_jobs ENABLE ROW LEVEL SECURITY;

-- Partial unique index to prevent duplicate active jobs
CREATE UNIQUE INDEX idx_ingest_jobs_active_url 
ON public.ingest_jobs(normalized_url, status) 
WHERE status IN ('queued', 'running');

-- Trigger to update updated_at
CREATE TRIGGER update_ingest_jobs_updated_at
BEFORE UPDATE ON public.ingest_jobs
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- RLS: authenticated users see their own, admins see all
CREATE POLICY "Users can view own jobs"
ON public.ingest_jobs FOR SELECT
TO authenticated
USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view public jobs"
ON public.ingest_jobs FOR SELECT
TO anon
USING (created_by IS NULL);

CREATE POLICY "Anyone can create jobs"
ON public.ingest_jobs FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Service role can manage all jobs"
ON public.ingest_jobs FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create rate limiting table
CREATE TABLE public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage rate limits"
ON public.rate_limits FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Additional indexes for job queue processing
CREATE INDEX idx_ingest_jobs_queued ON public.ingest_jobs(created_at) WHERE status = 'queued';
CREATE INDEX idx_ingest_jobs_status ON public.ingest_jobs(status, created_at);
CREATE INDEX idx_ingest_jobs_created_by ON public.ingest_jobs(created_by, created_at);