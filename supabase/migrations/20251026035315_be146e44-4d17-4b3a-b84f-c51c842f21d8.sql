-- Add user_id to deals_feed for user-specific access
-- Note: This is a breaking change - existing deals will have null user_id
ALTER TABLE deals_feed ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_deals_feed_user_id ON deals_feed(user_id);

-- Demo account user ID (replace with actual demo user ID after creation)
-- For now, we'll use a placeholder that can be updated via environment variable

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Authenticated users can view all active deals" ON deals_feed;
DROP POLICY IF EXISTS "Public users can view limited deal preview" ON deals_feed;

-- Create new RLS policies

-- 1. Users can view their own deals
CREATE POLICY "Users can view own deals"
ON deals_feed
FOR SELECT
USING (
  auth.uid() = user_id
);

-- 2. Public demo mode: unauthenticated users can see limited preview
CREATE POLICY "Public demo mode preview"
ON deals_feed
FOR SELECT
USING (
  auth.uid() IS NULL 
  AND is_active = true 
  AND id IN (
    SELECT deal_id 
    FROM get_preview_deal_ids()
  )
);

-- 3. Demo account bypass: specific user can see all deals (for testing)
-- Note: Update the user_id below with your actual demo account ID
CREATE POLICY "Demo account can view all deals"
ON deals_feed
FOR SELECT
USING (
  auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid -- Replace with actual demo user ID
  AND is_active = true
);

-- Allow authenticated users to insert deals
CREATE POLICY "Users can insert own deals"
ON deals_feed
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add user_id to listing_metrics via listings table
-- The existing RLS already checks through listings.user_id, so no changes needed there

-- Update deal_summaries to ensure user ownership
DROP POLICY IF EXISTS "Users can create own summaries" ON deal_summaries;
DROP POLICY IF EXISTS "Users can view own summaries" ON deal_summaries;
DROP POLICY IF EXISTS "Users can update own summaries" ON deal_summaries;
DROP POLICY IF EXISTS "Users can delete own summaries" ON deal_summaries;

CREATE POLICY "Users can create own summaries"
ON deal_summaries
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own summaries"
ON deal_summaries
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own summaries"
ON deal_summaries
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own summaries"
ON deal_summaries
FOR DELETE
USING (auth.uid() = user_id);