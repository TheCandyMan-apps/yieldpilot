-- Create watchlist table for tracking favorite deals
CREATE TABLE IF NOT EXISTS public.watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES public.deals_feed(id) ON DELETE CASCADE,
  notes TEXT,
  pipeline_status TEXT DEFAULT 'watching',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, deal_id)
);

-- Create price_history table for tracking price changes
CREATE TABLE IF NOT EXISTS public.price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals_feed(id) ON DELETE CASCADE,
  old_price NUMERIC NOT NULL,
  new_price NUMERIC NOT NULL,
  price_change_pct NUMERIC,
  changed_at TIMESTAMPTZ DEFAULT now()
);

-- Create filter_presets table for saved search filters
CREATE TABLE IF NOT EXISTS public.filter_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  filters JSONB NOT NULL DEFAULT '{}',
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create deal_comments table for deal notes and collaboration
CREATE TABLE IF NOT EXISTS public.deal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals_feed(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create custom_fields table for user-defined property fields
CREATE TABLE IF NOT EXISTS public.custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES public.deals_feed(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_value TEXT,
  field_type TEXT DEFAULT 'text',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create deal_pipeline table for kanban-style deal management
CREATE TABLE IF NOT EXISTS public.deal_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES public.deals_feed(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'prospect',
  priority TEXT DEFAULT 'medium',
  notes TEXT,
  moved_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, deal_id)
);

-- Enable RLS on all tables
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filter_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_pipeline ENABLE ROW LEVEL SECURITY;

-- Watchlist policies
CREATE POLICY "Users can manage own watchlist" ON public.watchlist
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Price history policies (read-only for users)
CREATE POLICY "Users can view price history" ON public.price_history
  FOR SELECT USING (true);

-- Filter presets policies
CREATE POLICY "Users can manage own presets" ON public.filter_presets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view shared presets" ON public.filter_presets
  FOR SELECT USING (is_shared = true OR auth.uid() = user_id);

-- Deal comments policies
CREATE POLICY "Users can manage own comments" ON public.deal_comments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all comments" ON public.deal_comments
  FOR SELECT USING (true);

-- Custom fields policies
CREATE POLICY "Users can manage own custom fields" ON public.custom_fields
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Deal pipeline policies
CREATE POLICY "Users can manage own pipeline" ON public.deal_pipeline
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON public.watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_deal ON public.watchlist(deal_id);
CREATE INDEX IF NOT EXISTS idx_price_history_deal ON public.price_history(deal_id);
CREATE INDEX IF NOT EXISTS idx_filter_presets_user ON public.filter_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_comments_deal ON public.deal_comments(deal_id);
CREATE INDEX IF NOT EXISTS idx_custom_fields_deal ON public.custom_fields(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_pipeline_user ON public.deal_pipeline(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_pipeline_stage ON public.deal_pipeline(stage);

-- Create trigger to track price changes automatically
CREATE OR REPLACE FUNCTION track_price_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.price IS DISTINCT FROM NEW.price THEN
    INSERT INTO public.price_history (deal_id, old_price, new_price, price_change_pct)
    VALUES (
      NEW.id,
      OLD.price,
      NEW.price,
      ROUND(((NEW.price - OLD.price) / OLD.price * 100)::numeric, 2)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER track_deal_price_changes
  AFTER UPDATE ON public.deals_feed
  FOR EACH ROW
  WHEN (OLD.price IS DISTINCT FROM NEW.price)
  EXECUTE FUNCTION track_price_changes();