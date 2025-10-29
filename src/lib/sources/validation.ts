import { z } from 'zod';

export const NormalizedListingSchema = z.object({
  address_line1: z.string().min(1),
  address_town: z.string().optional(),
  postcode: z.string().optional(),
  region: z.enum(['UK', 'US', 'DE', 'ES', 'FR', 'GB']),
  currency: z.enum(['GBP', 'USD', 'EUR']),
  price: z.number().positive(),
  bedrooms: z.number().optional(),
  bathrooms: z.number().optional(),
  property_type: z.string().optional(),
  estimated_rent: z.number().optional(),
  images: z.array(z.string()).default([]),
  listing_url: z.string().url(),
  location_lat: z.number().optional(),
  location_lng: z.number().optional(),
  source: z.string(),
  source_refs: z.record(z.any()).optional(),
  raw_data: z.any().optional(),
});

export type ValidatedListing = z.infer<typeof NormalizedListingSchema>;

export function validateListing(data: any): ValidatedListing {
  return NormalizedListingSchema.parse(data);
}

export function validateListings(data: any[]): {
  valid: ValidatedListing[];
  invalid: Array<{ data: any; error: string }>;
} {
  const valid: ValidatedListing[] = [];
  const invalid: Array<{ data: any; error: string }> = [];

  for (const item of data) {
    try {
      valid.push(validateListing(item));
    } catch (error) {
      invalid.push({
        data: item,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { valid, invalid };
}
