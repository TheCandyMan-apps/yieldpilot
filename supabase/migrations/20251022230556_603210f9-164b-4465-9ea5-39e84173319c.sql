-- Enable realtime on deals_feed so new imports appear without a manual reload
ALTER PUBLICATION supabase_realtime ADD TABLE public.deals_feed;