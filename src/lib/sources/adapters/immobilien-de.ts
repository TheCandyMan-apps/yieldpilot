import { SourceAdapter, NormalizedListing, RunResult } from '../types';

export const immobilienScoutAdapter: SourceAdapter = {
  id: 'immobilienscout-de',
  region: 'DE',
  displayName: 'ImmobilienScout24 (DE)',

  siteFor(url: string): boolean {
    return url.includes('immobilienscout24.de');
  },

  normalize(listing: any): NormalizedListing {
    return {
      address_line1: listing.address?.street || listing.street || '',
      address_town: listing.address?.city || listing.city || '',
      postcode: listing.address?.zip || listing.postcode || '',
      region: 'DE',
      currency: 'EUR',
      price: listing.price?.value || listing.price || 0,
      bedrooms: listing.numberOfRooms || listing.rooms,
      bathrooms: listing.numberOfBathRooms || 1,
      property_type: listing.realEstateType,
      estimated_rent: listing.calculatedPrice?.value,
      images: listing.attachments?.filter((a: any) => a['@type'] === 'Picture').map((a: any) => a.urls?.[0]?.['@href']) || [],
      listing_url: listing.url || '',
      location_lat: listing.address?.coordinate?.latitude,
      location_lng: listing.address?.coordinate?.longitude,
      source: 'immobilienscout',
      source_refs: {
        exposeId: listing['@id'],
      },
      raw_data: listing,
    };
  },

  async startRun(params): Promise<RunResult> {
    const response = await fetch('https://api.apify.com/v2/acts/maxcopell~immobilienscout24-scraper/runs', {
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
      throw new Error(`Failed to start ImmobilienScout run: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      status: data.data.status,
      runId: data.data.id,
      datasetId: data.data.defaultDatasetId,
    };
  },
};
