-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_property_analyses_user_id_created_at 
ON public.property_analyses(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_portfolios_user_id 
ON public.portfolios(user_id);

CREATE INDEX IF NOT EXISTS idx_portfolio_properties_portfolio_id 
ON public.portfolio_properties(portfolio_id);

-- Add index for profiles subscription tier lookups
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier 
ON public.profiles(subscription_tier);

-- Comment explaining indexes
COMMENT ON INDEX idx_property_analyses_user_id_created_at IS 'Improves performance for fetching user analyses sorted by date';
COMMENT ON INDEX idx_portfolios_user_id IS 'Optimizes portfolio lookups by user';
COMMENT ON INDEX idx_portfolio_properties_portfolio_id IS 'Speeds up portfolio property queries';
COMMENT ON INDEX idx_profiles_subscription_tier IS 'Optimizes subscription tier checks';