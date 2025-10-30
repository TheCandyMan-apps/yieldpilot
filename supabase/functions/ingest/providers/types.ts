export interface NormalizedListing {
  source: string;
  source_listing_id?: string;
  listing_url?: string;
  images?: string[];
  country: string;
  region?: string;
  city?: string;
  postcode?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  property_type?: string;
  tenure?: string;
  beds?: number;
  baths?: number;
  floor_area_m2?: number;
  lot_area_m2?: number;
  year_built?: number;
  price: number;
  currency: string;
  is_active?: boolean;
  days_on_market?: number;
}

export interface ProviderInterface {
  fetchBatch(since?: string): Promise<NormalizedListing[]>;
}
