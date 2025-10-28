import { SourceAdapter, NormalizedListing, RunResult } from '../types';

export const idealistaAdapter: SourceAdapter = {
  id: 'idealista-es',
  region: 'ES',
  displayName: 'Idealista (ES)',

  siteFor(url: string): boolean {
    return url.includes('idealista.com');
  },

  normalize(listing: any): NormalizedListing {
    return {
      address_line1: listing.address || '',
      address_town: listing.municipality || listing.district || '',
      postcode: listing.postalCode || '',
      region: 'ES',
      currency: 'EUR',
      price: listing.price || 0,
      bedrooms: listing.rooms || listing.bedrooms,
      bathrooms: listing.bathrooms || 1,
      property_type: listing.propertyType,
      estimated_rent: listing.estimatedRent,
      images: listing.images || [],
      listing_url: listing.url || '',
      location_lat: listing.latitude,
      location_lng: listing.longitude,
      source: 'idealista',
      source_refs: {
        id: listing.propertyCode,
      },
      raw_data: listing,
    };
  },

  async startRun(params): Promise<RunResult> {
    const response = await fetch('https://api.apify.com/v2/acts/maxcopell~idealista-scraper/runs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${params.token}`,
      },
      body: JSON.stringify({
        startUrls: [{ url: params.url }],
        maxItems: params.maxItems || 100,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to start Idealista run: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      status: data.data.status,
      runId: data.data.id,
      datasetId: data.data.defaultDatasetId,
    };
  },
};
