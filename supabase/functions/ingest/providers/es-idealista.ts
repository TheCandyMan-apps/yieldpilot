import { ProviderInterface, NormalizedListing } from './types.ts';

export const esIdealistaProvider: ProviderInterface = {
  async fetchBatch(since?: string): Promise<NormalizedListing[]> {
    // Mock stub - replace with actual Idealista API/scraper integration
    console.log('[es.idealista] Fetching batch since:', since);
    
    // In production, this would call Apify actor or Idealista API
    const mockListings: NormalizedListing[] = [
      {
        source: 'idealista',
        source_listing_id: 'ES11223344',
        listing_url: 'https://www.idealista.com/inmueble/11223344/',
        images: ['https://example.com/es-image1.jpg'],
        country: 'ES',
        region: 'Madrid',
        city: 'Madrid',
        postcode: '28001',
        address: 'Calle Mayor 1',
        latitude: 40.4168,
        longitude: -3.7038,
        property_type: 'apartment',
        tenure: 'freehold',
        beds: 2,
        baths: 1,
        floor_area_m2: 75,
        price: 350000,
        currency: 'EUR',
        is_active: true,
        days_on_market: 21,
      },
    ];

    return mockListings;
  },
};
