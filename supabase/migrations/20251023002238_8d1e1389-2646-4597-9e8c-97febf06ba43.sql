-- Purge all deal-related data again after tightening importer and disabling webhook
TRUNCATE TABLE 
  public.watchlist,
  public.deal_interactions,
  public.deal_summaries,
  public.renovation_estimates,
  public.investor_reports,
  public.deals_feed
RESTART IDENTITY CASCADE;