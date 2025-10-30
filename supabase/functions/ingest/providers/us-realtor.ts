import { ProviderInterface, NormalizedListing } from './types.ts';

export const usRealtorProvider: ProviderInterface = {
  async fetchBatch(since?: string): Promise<NormalizedListing[]> {
    // Mock stub - replace with actual Realtor.com API/scraper integration
    console.log('[us.realtor] Fetching batch since:', since);
    
    // In production, this would call Apify actor or Realtor API
    const mockListings: NormalizedListing[] = [
      {
        source: 'realtor',
        source_listing_id: 'US987654321',
        listing_url: 'https://www.realtor.com/realestateandhomes-detail/123-Main-St',
        images: ['https://example.com/us-image1.jpg'],
        country: 'US',
        region: 'California',
        city: 'San Francisco',
        postcode: '94102',
        address: '123 Main Street',
        latitude: 37.7749,
        longitude: -122.4194,
        property_type: 'condo',
        tenure: 'freehold',
        beds: 3,
        baths: 2.5,
        floor_area_m2: 120,
        lot_area_m2: 150,
        year_built: 2015,
        price: 1250000,
        currency: 'USD',
        is_active: true,
        days_on_market: 7,
      },
    ];

    return mockListings;
  },
};
