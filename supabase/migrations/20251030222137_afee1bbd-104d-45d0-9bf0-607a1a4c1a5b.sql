-- Create deal_comments table for commenting on deals
CREATE TABLE IF NOT EXISTS public.deal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deal_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all comments on deals they can access"
  ON public.deal_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = deal_comments.deal_id
      AND (listings.user_id = auth.uid() OR listings.is_active = true)
    )
  );

CREATE POLICY "Users can create comments on deals they can access"
  ON public.deal_comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = deal_comments.deal_id
      AND (listings.user_id = auth.uid() OR listings.is_active = true)
    )
  );

CREATE POLICY "Users can delete their own comments"
  ON public.deal_comments
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON public.deal_comments
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_deal_comments_deal_id ON public.deal_comments(deal_id);
CREATE INDEX idx_deal_comments_user_id ON public.deal_comments(user_id);
CREATE INDEX idx_deal_comments_created_at ON public.deal_comments(created_at DESC);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_deal_comments_updated_at
  BEFORE UPDATE ON public.deal_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for deal comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.deal_comments;