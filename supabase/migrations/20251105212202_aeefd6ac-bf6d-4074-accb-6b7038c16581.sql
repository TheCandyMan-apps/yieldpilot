-- Create user activity log table
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_description TEXT,
  ip_address TEXT,
  user_agent TEXT,
  device_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add index for faster queries
CREATE INDEX idx_user_activity_log_user_id ON public.user_activity_log(user_id);
CREATE INDEX idx_user_activity_log_created_at ON public.user_activity_log(created_at DESC);

-- Enable RLS
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

-- Users can only view their own activity logs
CREATE POLICY "Users can view their own activity logs"
  ON public.user_activity_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert activity logs (done via service role)
CREATE POLICY "Service role can insert activity logs"
  ON public.user_activity_log
  FOR INSERT
  WITH CHECK (true);

-- Function to log user activity
CREATE OR REPLACE FUNCTION public.log_user_activity_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_event_description TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_device_info JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO public.user_activity_log (
    user_id,
    event_type,
    event_description,
    ip_address,
    user_agent,
    device_info
  ) VALUES (
    p_user_id,
    p_event_type,
    p_event_description,
    p_ip_address,
    p_user_agent,
    p_device_info
  )
  RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$;