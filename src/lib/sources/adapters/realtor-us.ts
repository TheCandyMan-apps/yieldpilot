import { SourceAdapter, NormalizedListing, RunResult } from '../types';

export const realtorAdapter: SourceAdapter = {
  id: 'realtor-us',
  region: 'US',
  displayName: 'Realtor.com (US)',

  siteFor(url: string): boolean {
    return url.includes('realtor.com');
  },

  normalize(listing: any): NormalizedListing {
    const address = listing.location?.address || listing.address || {};
    return {
      address_line1: `${address.line || ''} ${address.street_number || ''} ${address.street_name || ''}`.trim(),
      address_town: address.city || '',
      postcode: address.postal_code || address.zip || '',
      region: 'US',
      currency: 'USD',
      price: listing.list_price || listing.price || 0,
      bedrooms: listing.description?.beds || listing.beds,
      bathrooms: listing.description?.baths || listing.baths,
      property_type: listing.prop_type || listing.property_type,
      estimated_rent: listing.community?.price_max, // Rental estimate
      images: listing.photos?.map((p: any) => p.href || p.url || p) || [],
      listing_url: listing.href || listing.permalink || '',
      location_lat: listing.location?.address?.coordinate?.lat,
      location_lng: listing.location?.address?.coordinate?.lon,
      source: 'realtor',
      source_refs: {
        propertyId: listing.property_id,
        mlsId: listing.mls?.id,
      },
      raw_data: listing,
    };
  },

  async startRun(params): Promise<RunResult> {
    const response = await fetch('https://api.apify.com/v2/acts/maxcopell~realtorcom-scraper/runs', {
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
      throw new Error(`Failed to start Realtor run: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      status: data.data.status,
      runId: data.data.id,
      datasetId: data.data.defaultDatasetId,
    };
  },
};
