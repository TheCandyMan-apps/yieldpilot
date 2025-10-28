import { SourceAdapter, NormalizedListing, RunResult } from '../types';

export const zooplaAdapter: SourceAdapter = {
  id: 'zoopla-uk',
  region: 'UK',
  displayName: 'Zoopla (UK)',

  siteFor(url: string): boolean {
    return url.includes('zoopla.co.uk');
  },

  normalize(listing: any): NormalizedListing {
    return {
      address_line1: listing.displayAddress || listing.address || '',
      address_town: listing.town || listing.county || '',
      postcode: listing.outcode || listing.postcode || '',
      region: 'UK',
      currency: 'GBP',
      price: listing.price || 0,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      property_type: listing.propertyType || listing.propertySubType,
      estimated_rent: listing.rental?.monthlyPrice,
      images: listing.images?.map((img: any) => img.url || img) || [],
      listing_url: listing.detailsUrl || listing.listingUrl || '',
      location_lat: listing.location?.latitude,
      location_lng: listing.location?.longitude,
      source: 'zoopla',
      source_refs: {
        listingId: listing.listingId,
        propertyId: listing.propertyId,
      },
      raw_data: listing,
    };
  },

  async startRun(params): Promise<RunResult> {
    const response = await fetch('https://api.apify.com/v2/acts/maxcopell~zoopla-scraper/runs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${params.token}`,
      },
      body: JSON.stringify({
        startUrls: [{ url: params.url }],
        maxItems: params.maxItems || 100,
        extendOutputFunction: '({ data }) => data',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to start Zoopla run: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      status: data.data.status,
      runId: data.data.id,
      datasetId: data.data.defaultDatasetId,
    };
  },
};
