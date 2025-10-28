-- Fix critical security issues
DROP POLICY IF EXISTS "Anyone can create jobs" ON public.ingest_jobs;

CREATE POLICY "Authenticated users can create jobs"
  ON public.ingest_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Restrict deals_feed public access  
DROP POLICY IF EXISTS "Public demo mode preview" ON public.deals_feed;

CREATE POLICY "Limited public preview"
  ON public.deals_feed
  FOR SELECT
  TO anon
  USING (is_active = true AND created_at >= NOW() - INTERVAL '7 days');

CREATE POLICY "Authenticated users full access"
  ON public.deals_feed
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Restrict profiles to owner only
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view own profile only"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);