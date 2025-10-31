-- Fix security definer view issue by dropping it and creating a function instead
DROP VIEW IF EXISTS public.v_user_entitlements;

-- Create a secure function to get user entitlements instead of a view
CREATE OR REPLACE FUNCTION public.get_user_entitlements(_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  plan TEXT,
  features JSONB,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ue.user_id,
    COALESCE(ue.plan, 'free')::TEXT as plan,
    ue.features,
    ue.expires_at,
    CASE 
      WHEN ue.expires_at IS NULL THEN true
      WHEN ue.expires_at > now() THEN true
      ELSE false
    END as is_active
  FROM public.user_entitlements ue
  WHERE ue.user_id = _user_id
  AND (ue.expires_at IS NULL OR ue.expires_at > now());
$$;