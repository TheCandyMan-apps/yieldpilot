import { SourceAdapter, NormalizedListing, RunResult } from '../types';

export const redfinAdapter: SourceAdapter = {
  id: 'redfin-us',
  region: 'US',
  displayName: 'Redfin (US)',

  siteFor(url: string): boolean {
    return url.includes('redfin.com');
  },

  normalize(listing: any): NormalizedListing {
    const address = listing.address || {};
    return {
      address_line1: address.line1 || address.street || '',
      address_town: address.city || '',
      postcode: address.zip || address.postalCode || '',
      region: 'US',
      currency: 'USD',
      price: listing.price || listing.listPrice || 0,
      bedrooms: listing.beds || listing.bedrooms,
      bathrooms: listing.baths || listing.bathrooms,
      property_type: listing.propertyType || listing.homeType,
      estimated_rent: listing.rentEstimate,
      images: listing.photos?.map((p: any) => p.url || p) || [],
      listing_url: listing.url || `https://www.redfin.com${listing.path || ''}`,
      location_lat: listing.latitude || listing.latLong?.latitude,
      location_lng: listing.longitude || listing.latLong?.longitude,
      source: 'redfin',
      source_refs: {
        mlsId: listing.mlsId,
        listingId: listing.listingId,
      },
      raw_data: listing,
    };
  },

  async startRun(params): Promise<RunResult> {
    const response = await fetch('https://api.apify.com/v2/acts/maxcopell~redfin-scraper/runs', {
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
      throw new Error(`Failed to start Redfin run: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      status: data.data.status,
      runId: data.data.id,
      datasetId: data.data.defaultDatasetId,
    };
  },
};
