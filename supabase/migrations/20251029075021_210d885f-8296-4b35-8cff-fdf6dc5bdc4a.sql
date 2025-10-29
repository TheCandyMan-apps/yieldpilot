-- Add forecast usage tracking
CREATE TABLE IF NOT EXISTS forecast_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  forecast_horizon TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  model_version TEXT,
  cost_tokens INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE forecast_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view own forecast usage"
  ON forecast_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Service can insert usage records
CREATE POLICY "Service can insert forecast usage"
  ON forecast_usage FOR INSERT
  WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX idx_forecast_usage_user_date ON forecast_usage(user_id, created_at DESC);
CREATE INDEX idx_forecast_usage_listing ON forecast_usage(listing_id);

-- Function to check forecast limit
CREATE OR REPLACE FUNCTION check_forecast_limit(p_user_id UUID, p_tier TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  usage_count INTEGER;
  daily_limit INTEGER;
BEGIN
  -- Set limits per tier
  daily_limit := CASE p_tier
    WHEN 'free' THEN 1
    WHEN 'starter' THEN 3
    WHEN 'pro' THEN 10
    WHEN 'team' THEN -1  -- unlimited
    ELSE 1
  END;

  -- Unlimited for team
  IF daily_limit = -1 THEN
    RETURN TRUE;
  END IF;

  -- Count today's usage
  SELECT COUNT(*) INTO usage_count
  FROM forecast_usage
  WHERE user_id = p_user_id
    AND created_at > CURRENT_DATE;

  RETURN usage_count < daily_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;