import { ProviderInterface, NormalizedListing } from './types.ts';

export const ukRightmoveProvider: ProviderInterface = {
  async fetchBatch(since?: string): Promise<NormalizedListing[]> {
    // Mock stub - replace with actual Rightmove API/scraper integration
    console.log('[uk.rightmove] Fetching batch since:', since);
    
    // In production, this would call Apify actor or Rightmove API
    const mockListings: NormalizedListing[] = [
      {
        source: 'rightmove',
        source_listing_id: 'RM12345678',
        listing_url: 'https://www.rightmove.co.uk/properties/12345678',
        images: ['https://example.com/image1.jpg'],
        country: 'GB',
        region: 'London',
        city: 'Westminster',
        postcode: 'SW1A 1AA',
        address: '10 Downing Street',
        latitude: 51.5034,
        longitude: -0.1276,
        property_type: 'apartment',
        tenure: 'leasehold',
        beds: 2,
        baths: 2,
        floor_area_m2: 85,
        price: 750000,
        currency: 'GBP',
        is_active: true,
        days_on_market: 14,
      },
    ];

    return mockListings;
  },
};
