// Global Source Adapter Types

export interface NormalizedListing {
  address_line1: string;
  address_town?: string;
  postcode?: string;
  region: string;
  currency: string;
  price: number;
  bedrooms?: number;
  bathrooms?: number;
  property_type?: string;
  estimated_rent?: number;
  images: string[];
  listing_url: string;
  location_lat?: number;
  location_lng?: number;
  source: string;
  source_refs: Record<string, any>;
  raw_data?: any;
}

export interface RunResult {
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  runId?: string;
  datasetId?: string;
  error?: string;
}

export interface SourceAdapter {
  id: string;              // e.g. "zoopla-uk", "realtor-us"
  region: string;          // ISO region ("UK", "US", "DE", "FR", "ES")
  displayName: string;     // User-friendly name
  siteFor(url: string): boolean;  // Check if URL matches this source
  normalize(listing: any): NormalizedListing;  // Map to universal schema
  startRun(params: { 
    url: string; 
    detail?: boolean; 
    token: string;
    maxItems?: number;
  }): Promise<RunResult>;
}

export interface RegionalConfig {
  region: string;
  currency: string;
  locale: string;
  taxRate: number;
  maintenanceRate: number;
  insuranceRate: number;
  mortgageDeductible: boolean;
  closingCostsPct: number;
}
