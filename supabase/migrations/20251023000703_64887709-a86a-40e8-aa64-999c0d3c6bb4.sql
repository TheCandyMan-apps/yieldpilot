-- Purge all deal-related data per user request (2025-10-23)
-- Truncate all related tables together to satisfy FKs and cascade
TRUNCATE TABLE 
  public.watchlist,
  public.deal_interactions,
  public.deal_summaries,
  public.renovation_estimates,
  public.investor_reports,
  public.deals_feed
RESTART IDENTITY CASCADE;