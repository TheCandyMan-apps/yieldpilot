-- Create account deletion requests table
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  scheduled_deletion_at TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT,
  data_export_requested BOOLEAN DEFAULT false,
  data_export_completed BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Add index
CREATE INDEX idx_account_deletion_user_id ON public.account_deletion_requests(user_id);
CREATE INDEX idx_account_deletion_scheduled ON public.account_deletion_requests(scheduled_deletion_at);

-- Enable RLS
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own deletion requests
CREATE POLICY "Users can view their own deletion requests"
  ON public.account_deletion_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own deletion requests
CREATE POLICY "Users can insert their own deletion requests"
  ON public.account_deletion_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update (cancel) their own deletion requests
CREATE POLICY "Users can cancel their own deletion requests"
  ON public.account_deletion_requests
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to check if user has pending deletion
CREATE OR REPLACE FUNCTION public.has_pending_deletion(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.account_deletion_requests
    WHERE user_id = p_user_id
      AND cancelled_at IS NULL
      AND scheduled_deletion_at > now()
  );
$$;