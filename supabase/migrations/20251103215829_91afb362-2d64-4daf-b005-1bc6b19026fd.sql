-- Create ai_queries table for tracking market intelligence usage
CREATE TABLE IF NOT EXISTS public.ai_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  query_type TEXT NOT NULL,
  query_text TEXT NOT NULL,
  response_text TEXT,
  context_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_queries ENABLE ROW LEVEL SECURITY;

-- Users can view their own queries
CREATE POLICY "Users can view own ai queries"
  ON public.ai_queries
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert queries
CREATE POLICY "Service can insert ai queries"
  ON public.ai_queries
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_ai_queries_user_date ON public.ai_queries(user_id, created_at DESC);
CREATE INDEX idx_ai_queries_type ON public.ai_queries(query_type, created_at DESC);