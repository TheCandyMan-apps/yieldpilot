-- Fix CLIENT_SIDE_AUTH vulnerability: Enforce subscription tier validation at database level
-- This prevents free users from bypassing client-side EntitlementGuard to create API keys

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can manage own API keys" ON public.api_keys;

-- SELECT: All authenticated users can view their own API keys
CREATE POLICY "Users can view own API keys"
ON public.api_keys FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- INSERT: Only premium tier users can create API keys
-- This is the critical security control that blocks free users
CREATE POLICY "Premium users can create API keys"
ON public.api_keys FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.user_entitlements
    WHERE user_id = auth.uid()
    AND plan IN ('pro', 'investor', 'deal_lab', 'enterprise')
    AND (expires_at IS NULL OR expires_at > now())
  )
);

-- UPDATE: Users can update their own API keys (ownership check only)
-- Application layer prevents updating security-critical fields
CREATE POLICY "Users can update own API keys"
ON public.api_keys FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete their own API keys
CREATE POLICY "Users can delete own API keys"
ON public.api_keys FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Service role retains full access for admin operations
CREATE POLICY "Service role manages all API keys"
ON public.api_keys FOR ALL
TO service_role
USING (true)
WITH CHECK (true);