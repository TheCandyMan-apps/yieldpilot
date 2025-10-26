-- Fix function search_path mutable warning
DROP TRIGGER IF EXISTS update_listings_updated_at ON public.listings;
DROP TRIGGER IF EXISTS update_listing_metrics_updated_at ON public.listing_metrics;
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Recreate with proper search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_listings_updated_at
    BEFORE UPDATE ON public.listings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_listing_metrics_updated_at
    BEFORE UPDATE ON public.listing_metrics
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();