-- Create user_scenarios table for saving custom underwriting analyses
CREATE TABLE IF NOT EXISTS public.user_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  strategy_key text NOT NULL,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add index for user queries
CREATE INDEX idx_user_scenarios_user_id ON public.user_scenarios(user_id);
CREATE INDEX idx_user_scenarios_listing_id ON public.user_scenarios(listing_id);

-- Enable RLS
ALTER TABLE public.user_scenarios ENABLE ROW LEVEL SECURITY;

-- Users can manage their own scenarios
CREATE POLICY "Users can manage own scenarios"
  ON public.user_scenarios
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_scenarios_updated_at
  BEFORE UPDATE ON public.user_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();