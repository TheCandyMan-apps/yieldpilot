import { SourceAdapter, NormalizedListing, RunResult } from '../types';

export const selogerAdapter: SourceAdapter = {
  id: 'seloger-fr',
  region: 'FR',
  displayName: 'SeLoger (FR)',

  siteFor(url: string): boolean {
    return url.includes('seloger.com');
  },

  normalize(listing: any): NormalizedListing {
    return {
      address_line1: listing.location?.address || '',
      address_town: listing.location?.city || '',
      postcode: listing.location?.zipCode || '',
      region: 'FR',
      currency: 'EUR',
      price: listing.price || 0,
      bedrooms: listing.rooms || listing.bedrooms,
      bathrooms: listing.bathrooms || 1,
      property_type: listing.propertyType,
      estimated_rent: listing.estimatedRent,
      images: listing.photos || [],
      listing_url: listing.url || '',
      location_lat: listing.coordinates?.latitude,
      location_lng: listing.coordinates?.longitude,
      source: 'seloger',
      source_refs: {
        id: listing.id,
      },
      raw_data: listing,
    };
  },

  async startRun(params): Promise<RunResult> {
    const response = await fetch('https://api.apify.com/v2/acts/maxcopell~seloger-scraper/runs', {
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
      throw new Error(`Failed to start SeLoger run: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      status: data.data.status,
      runId: data.data.id,
      datasetId: data.data.defaultDatasetId,
    };
  },
};
