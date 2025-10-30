/**
 * YieldPilot Database Types
 * Auto-generated from Supabase schema
 * 
 * Use these types for type-safe database queries
 */

export interface Listing {
  id: string;
  source: string;
  source_listing_id: string | null;
  listing_url: string | null;
  images: string[];
  country: string;
  region: string | null;
  city: string | null;
  postcode: string | null;
  address_line1: string | null;
  latitude: number | null;
  longitude: number | null;
  property_type: string | null;
  tenure: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  square_feet: number | null;
  floor_area_m2: number | null;
  lot_area_m2: number | null;
  year_built: number | null;
  price: number;
  currency: string;
  estimated_rent: number | null;
  is_active: boolean;
  days_on_market: number | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  data_provenance: any;
  source_refs: any;
}

export interface ListingMetrics {
  listing_id: string;
  gross_rent_month: number | null;
  operating_exp_pct: number | null;
  vacancy_pct: number | null;
  gross_yield_pct: number | null;
  net_yield_pct: number | null;
  cashflow_monthly: number | null;
  score_numeric: number | null;
  score_band: string | null;
  explain_json: {
    drivers?: string[];
    risks?: string[];
    opportunities?: string[];
  };
  assumptions: any;
  dscr: number | null;
  irr_10yr: number | null;
  cash_on_cash_return: number | null;
  cap_rate: number | null;
  capex_total: number;
  capex_breakdown: any;
  rank_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface FxRate {
  base: string;
  target: string;
  rate: number;
  fetched_at: string;
}

// View types
export interface ActiveListing extends Listing {
  price_usd: number | null;
  price_eur: number | null;
}

export interface InvestorDeal extends ActiveListing {
  // Metrics fields
  gross_rent_month: number | null;
  operating_exp_pct: number | null;
  vacancy_pct: number | null;
  gross_yield_pct: number | null;
  net_yield_pct: number | null;
  cashflow_monthly: number | null;
  score_numeric: number | null;
  score_band: string | null;
  explain_json: {
    drivers?: string[];
    risks?: string[];
    opportunities?: string[];
  } | null;
  dscr: number | null;
  irr_10yr: number | null;
  cap_rate: number | null;
}

// Utility types
export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'team' | 'agency';
export type Currency = 'GBP' | 'USD' | 'EUR';
export type Country = 'GB' | 'US' | 'ES' | 'FR' | 'DE';
export type ScoreBand = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

// Filter types
export interface DealFilters {
  country?: Country[];
  region?: string[];
  city?: string[];
  minPrice?: number;
  maxPrice?: number;
  currency?: Currency;
  minYield?: number;
  maxYield?: number;
  minBeds?: number;
  maxBeds?: number;
  propertyType?: string[];
  scoreBand?: ScoreBand[];
  minScore?: number;
  searchText?: string;
  radiusKm?: number;
  centerLat?: number;
  centerLng?: number;
  daysOld?: number;
}

// Sort options
export type DealSortBy = 
  | 'score_desc'
  | 'yield_desc'
  | 'price_asc'
  | 'price_desc'
  | 'newest'
  | 'oldest';

// API response types
export interface IngestProviderRequest {
  provider: string;
  url: string;
  maxItems?: number;
  userId?: string;
}

export interface IngestProviderResponse {
  success: boolean;
  provider: string;
  runId: string;
  datasetId?: string;
  itemsFetched: number;
  itemsInserted: number;
  listingIds: string[];
}

export interface CalculateDealRequest {
  listingId: string;
  assumptions?: any;
}

export interface CalculateDealResponse {
  success: boolean;
  listingId: string;
  metrics: ListingMetrics;
}
