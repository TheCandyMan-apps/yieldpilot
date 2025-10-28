-- Create community discussions table
CREATE TABLE IF NOT EXISTS public.community_discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  views INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create discussion replies table
CREATE TABLE IF NOT EXISTS public.discussion_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES public.community_discussions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create deal notes table (private notes on listings)
CREATE TABLE IF NOT EXISTS public.deal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.community_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for community_discussions
CREATE POLICY "Anyone can view discussions"
  ON public.community_discussions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create discussions"
  ON public.community_discussions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own discussions"
  ON public.community_discussions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own discussions"
  ON public.community_discussions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for discussion_replies
CREATE POLICY "Anyone can view replies"
  ON public.discussion_replies FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create replies"
  ON public.discussion_replies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own replies"
  ON public.discussion_replies FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own replies"
  ON public.discussion_replies FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for deal_notes
CREATE POLICY "Users can view own notes"
  ON public.deal_notes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own notes"
  ON public.deal_notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes"
  ON public.deal_notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
  ON public.deal_notes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_discussions_category ON public.community_discussions(category);
CREATE INDEX idx_discussions_user ON public.community_discussions(user_id);
CREATE INDEX idx_discussion_replies_discussion ON public.discussion_replies(discussion_id);
CREATE INDEX idx_deal_notes_listing ON public.deal_notes(listing_id);
CREATE INDEX idx_deal_notes_user ON public.deal_notes(user_id);

-- Function to update reply count
CREATE OR REPLACE FUNCTION update_discussion_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_discussions
    SET reply_count = reply_count + 1
    WHERE id = NEW.discussion_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_discussions
    SET reply_count = GREATEST(0, reply_count - 1)
    WHERE id = OLD.discussion_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for reply count
CREATE TRIGGER update_reply_count_trigger
AFTER INSERT OR DELETE ON public.discussion_replies
FOR EACH ROW EXECUTE FUNCTION update_discussion_reply_count();