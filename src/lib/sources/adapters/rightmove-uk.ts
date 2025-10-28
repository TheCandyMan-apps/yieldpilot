import { SourceAdapter, NormalizedListing, RunResult } from '../types';

export const rightmoveAdapter: SourceAdapter = {
  id: 'rightmove-uk',
  region: 'UK',
  displayName: 'Rightmove (UK)',

  siteFor(url: string): boolean {
    return url.includes('rightmove.co.uk');
  },

  normalize(listing: any): NormalizedListing {
    return {
      address_line1: listing.displayAddress || listing.address?.displayAddress || '',
      address_town: listing.location?.town || '',
      postcode: listing.location?.outcode || '',
      region: 'UK',
      currency: 'GBP',
      price: listing.price?.amount || listing.price || 0,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      property_type: listing.propertySubType || listing.propertyType,
      estimated_rent: listing.lettings?.monthlyPrice,
      images: listing.propertyImages?.map((img: any) => img.srcUrl || img.url || img) || [],
      listing_url: listing.propertyUrl || `https://www.rightmove.co.uk/properties/${listing.id}`,
      location_lat: listing.location?.latitude,
      location_lng: listing.location?.longitude,
      source: 'rightmove',
      source_refs: {
        propertyId: listing.id || listing.propertyId,
      },
      raw_data: listing,
    };
  },

  async startRun(params): Promise<RunResult> {
    const response = await fetch('https://api.apify.com/v2/acts/shanes~rightmove-scraper/runs', {
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
      throw new Error(`Failed to start Rightmove run: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      status: data.data.status,
      runId: data.data.id,
      datasetId: data.data.defaultDatasetId,
    };
  },
};
