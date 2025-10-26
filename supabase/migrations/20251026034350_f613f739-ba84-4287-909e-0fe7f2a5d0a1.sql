-- Add pipeline status to watchlist
ALTER TABLE watchlist ADD COLUMN pipeline_status TEXT DEFAULT 'watching' CHECK (pipeline_status IN ('saved', 'watching', 'offer_made'));

-- Add index for faster filtering
CREATE INDEX idx_watchlist_pipeline_status ON watchlist(user_id, pipeline_status);