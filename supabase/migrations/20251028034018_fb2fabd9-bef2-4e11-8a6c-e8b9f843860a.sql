-- Add social/networking columns to investor_profiles for Phase 7
ALTER TABLE public.investor_profiles
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS aum_range TEXT CHECK (aum_range IN ('under_100k', '100k_500k', '500k_1m', '1m_5m', '5m_plus')),
ADD COLUMN IF NOT EXISTS preferred_regions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS min_yield_target NUMERIC,
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reputation_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS total_deals INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS successful_exits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'connections'));

-- Create index for public profiles lookup
CREATE INDEX IF NOT EXISTS idx_investor_profiles_visibility ON public.investor_profiles(visibility) WHERE visibility = 'public';
CREATE INDEX IF NOT EXISTS idx_investor_profiles_reputation ON public.investor_profiles(reputation_score DESC) WHERE visibility = 'public';