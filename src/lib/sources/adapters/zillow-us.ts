import { SourceAdapter, NormalizedListing, RunResult } from '../types';

export const zillowAdapter: SourceAdapter = {
  id: 'zillow-us',
  region: 'US',
  displayName: 'Zillow (US)',

  siteFor(url: string): boolean {
    return url.includes('zillow.com');
  },

  normalize(listing: any): NormalizedListing {
    const address = listing.address || {};
    return {
      address_line1: address.streetAddress || '',
      address_town: address.city || '',
      postcode: address.zipcode || '',
      region: 'US',
      currency: 'USD',
      price: listing.price || listing.unformattedPrice || 0,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      property_type: listing.homeType,
      estimated_rent: listing.rentZestimate,
      images: listing.photos?.map((url: string) => url) || [],
      listing_url: listing.url || listing.hdpUrl || '',
      location_lat: listing.latitude,
      location_lng: listing.longitude,
      source: 'zillow',
      source_refs: {
        zpid: listing.zpid,
      },
      raw_data: listing,
    };
  },

  async startRun(params): Promise<RunResult> {
    const response = await fetch('https://api.apify.com/v2/acts/maxcopell~zillow-scraper/runs', {
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
      throw new Error(`Failed to start Zillow run: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      status: data.data.status,
      runId: data.data.id,
      datasetId: data.data.defaultDatasetId,
    };
  },
};
