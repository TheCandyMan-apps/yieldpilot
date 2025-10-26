# Apify Import Function

This edge function imports property data from Apify datasets into the `deals_feed` table.

## Overview

The function polls Apify for completed scraping runs, fetches the dataset items, normalizes the data from both Rightmove and Zoopla into a unified format, and inserts them into the database.

## Data Normalization

Both Rightmove and Zoopla scrapers return different data structures. This function normalizes them into a consistent internal format.

### Unified Internal Schema

All properties are mapped to the following structure:

```typescript
{
  property_address: string;
  postcode: string | null;
  city: string | null;
  property_type: 'residential' | 'commercial' | 'land';
  price: number;
  estimated_rent: number;
  bedrooms: number | null;
  bathrooms: number | null;
  square_feet: number | null;
  image_url: string | null;
  listing_url: string | null;
  location_lat: number | null;
  location_lng: number | null;
  source: 'apify-rightmove' | 'apify-zoopla';
  is_active: boolean;
  yield_percentage: number;
  roi_percentage: number;
  cash_flow_monthly: number;
  investment_score: 'A' | 'B' | 'C' | 'D' | 'E';
}
```

### Rightmove Field Mapping

The Rightmove mapper handles both detail and list view outputs:

```typescript
// Address fields
prop.address?.displayAddress || prop.propertyAddress || prop.displayAddress || prop.title

// Price fields
prop.price?.amount || prop.price || prop.propertyPrice || prop.displayPrice

// Image fields (prioritizes high-quality)
prop.propertyImages?.[0]?.url || prop.propertyImages?.[0] || 
prop.images?.[0]?.url || prop.images?.[0] || 
prop.mainImage?.url || prop.mainImage

// URL construction
prop.propertyUrl || prop.url || prop.detailUrl || 
`https://www.rightmove.co.uk/properties/${prop.id}`

// Location fields
prop.location?.latitude || prop.latitude
prop.location?.longitude || prop.longitude

// Property details
prop.propertySubType || prop.propertyType || prop.type
prop.bedrooms || prop.bedroom
prop.bathrooms || prop.bathroom
prop.size?.max || prop.floorArea
```

### Zoopla Field Mapping

The Zoopla mapper handles various output formats:

```typescript
// Address fields
prop.address || prop.displayAddress || prop.title

// Image fields
prop.image?.url || prop.image || 
prop.images?.[0]?.url || prop.images?.[0] ||
prop.mainImage?.url || prop.mainImage

// URL fields
prop.url || prop.detailsUrl

// Location fields
prop.latitude || prop.location?.latitude
prop.longitude || prop.location?.longitude

// Postcode
prop.postcode || prop.outcode

// Property details
prop.propertyType || prop.type
prop.bedrooms || prop.bedroom
prop.bathrooms || prop.bathroom
prop.floorArea
```

## Location Filtering

The function includes sophisticated location matching that handles:
- Direct city/town names (e.g., "Guildford", "Manchester")
- Postcode districts (e.g., "GU1", "M1")
- Postcode outward codes (e.g., "KT22")
- County names with known postcode prefixes (e.g., "Surrey")
- Multiple known towns within a county

### Location Matching Logic

1. **Direct match**: Search term appears in address or city field
2. **Postcode matching**: Matches outward codes and districts
3. **County-level matching**: Uses predefined postcode prefixes and town lists
4. **Town inference**: Identifies county from town name and matches accordingly

## Calculations

### Estimated Rent
```typescript
estimatedRent = price * 0.004  // 0.4% of purchase price monthly
```

### Yield Percentage
```typescript
yield = (monthlyRent * 12 / purchasePrice) * 100
```

### ROI Percentage
```typescript
deposit = price * 0.25
annualAppreciation = price * 0.03
roi = (annualAppreciation / deposit) * 100
```

### Cash Flow
```typescript
mortgage = (price * 0.75) * 0.05 / 12  // 75% LTV, 5% annual interest
expenses = rent * 0.2                   // 20% for expenses
cashFlow = rent - mortgage - expenses
```

### Investment Score
- **A**: Yield ≥ 8%
- **B**: Yield ≥ 6%
- **C**: Yield ≥ 4%
- **D**: Yield ≥ 2%
- **E**: Yield < 2%

## API Usage

### Request Body
```json
{
  "runId": "apify-run-id",
  "datasetId": "optional-dataset-id",
  "source": "rightmove" | "zoopla",
  "location": "optional-search-location"
}
```

### Response
```json
{
  "imported": 42,
  "source": "rightmove"
}
```

## Error Handling

The function includes comprehensive error handling:
- Missing environment variables
- Polling timeout (40 attempts × 5s = ~200s max)
- Empty datasets
- Invalid data (filters out properties with no price or "Unknown Address")
- Database insertion errors

## Performance

- Polls Apify every 5 seconds for up to 200 seconds
- Processes all items in a single batch insert
- Filters items by location before insertion to reduce database load

## Notes

- Both detail URLs and list URLs are handled identically through Apify's scraper configuration
- The function maintains the same behavior for both sources (list mode first)
- All properties must have a valid price and address to be inserted
- Source tracking allows filtering/sorting by data provider in the UI
