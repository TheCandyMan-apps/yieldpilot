-- Ingestion audit table
CREATE TABLE IF NOT EXISTS public.ingest_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  count int NOT NULL DEFAULT 0,
  duration_ms int NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Saved searches table
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  filters_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  last_run_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Push subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription_type text NOT NULL CHECK (subscription_type IN ('web_push', 'fcm')),
  endpoint text,
  p256dh text,
  auth_key text,
  fcm_token text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

-- Alert matches table - fixed FK reference
CREATE TABLE IF NOT EXISTS public.search_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id uuid REFERENCES public.saved_searches(id) ON DELETE CASCADE NOT NULL,
  listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  matched_at timestamptz DEFAULT now(),
  is_read boolean DEFAULT false,
  is_notified boolean DEFAULT false,
  UNIQUE (search_id, listing_id)
);

-- Enable RLS
ALTER TABLE public.ingest_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ingest_audit (admin only)
CREATE POLICY "Admins can view ingest audit"
  ON public.ingest_audit FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for saved_searches
CREATE POLICY "Users can manage own saved searches"
  ON public.saved_searches FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for push_subscriptions
CREATE POLICY "Users can manage own push subscriptions"
  ON public.push_subscriptions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for search_matches
CREATE POLICY "Users can view own search matches"
  ON public.search_matches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.saved_searches
      WHERE saved_searches.id = search_matches.search_id
      AND saved_searches.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own search matches"
  ON public.search_matches FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.saved_searches
      WHERE saved_searches.id = search_matches.search_id
      AND saved_searches.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_ingest_audit_provider_fetched ON public.ingest_audit(provider, fetched_at DESC);
CREATE INDEX idx_saved_searches_user_active ON public.saved_searches(user_id, is_active);
CREATE INDEX idx_push_subscriptions_user ON public.push_subscriptions(user_id, is_active);
CREATE INDEX idx_search_matches_search_listing ON public.search_matches(search_id, listing_id);
CREATE INDEX idx_search_matches_unread ON public.search_matches(is_read, matched_at DESC);

-- Triggers for updated_at
CREATE TRIGGER update_saved_searches_updated_at
  BEFORE UPDATE ON public.saved_searches
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();