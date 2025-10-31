import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// Validation schema for scraped property data
export const ScrapedPropertySchema = z.object({
  // Price can be in various formats
  price: z.union([
    z.number(),
    z.string(),
    z.object({
      amount: z.union([z.number(), z.string()]).optional(),
    })
  ]).transform((val) => {
    let priceNum: number;
    if (typeof val === 'number') {
      priceNum = val;
    } else if (typeof val === 'string') {
      const cleaned = val.replace(/[£,\s]/g, '');
      priceNum = parseFloat(cleaned);
    } else if (val && typeof val === 'object' && 'amount' in val) {
      const amount = val.amount;
      if (typeof amount === 'number') {
        priceNum = amount;
      } else if (typeof amount === 'string') {
        const cleaned = amount.replace(/[£,\s]/g, '');
        priceNum = parseFloat(cleaned);
      } else {
        throw new Error('Invalid price format');
      }
    } else {
      throw new Error('Invalid price format');
    }
    
    if (isNaN(priceNum) || priceNum <= 0 || priceNum > 100000000) {
      throw new Error('Price out of valid range');
    }
    return priceNum;
  }),
  
  // Address can be nested or flat
  address: z.union([
    z.string().max(500),
    z.object({
      displayAddress: z.string().max(500).optional(),
      postcode: z.string().max(20).optional(),
      town: z.string().max(100).optional(),
      city: z.string().max(100).optional(),
    })
  ]).optional(),
  
  displayAddress: z.string().max(500).optional(),
  propertyAddress: z.string().max(500).optional(),
  title: z.string().max(500).optional(),
  
  postcode: z.string().max(20).optional(),
  
  city: z.string().max(100).optional(),
  town: z.string().max(100).optional(),
  county: z.string().max(100).optional(),
  location: z.union([
    z.string().max(100),
    z.object({
      latitude: z.union([z.number(), z.string()]).optional(),
      longitude: z.union([z.number(), z.string()]).optional(),
    })
  ]).optional(),
  
  propertyType: z.string().max(50).optional(),
  propertySubType: z.string().max(50).optional(),
  
  bedrooms: z.union([z.number(), z.string()]).transform(val => {
    const num = typeof val === 'number' ? val : parseInt(val);
    return isNaN(num) || num < 0 || num > 50 ? null : num;
  }).optional(),
  
  bathrooms: z.union([z.number(), z.string()]).transform(val => {
    const num = typeof val === 'number' ? val : parseInt(val);
    return isNaN(num) || num < 0 || num > 50 ? null : num;
  }).optional(),
  
  // Coordinates - can be nested or flat
  latitude: z.union([z.number(), z.string()]).transform(val => {
    const num = typeof val === 'number' ? val : parseFloat(val);
    return isNaN(num) || num < -90 || num > 90 ? null : num;
  }).optional(),
  
  longitude: z.union([z.number(), z.string()]).transform(val => {
    const num = typeof val === 'number' ? val : parseFloat(val);
    return isNaN(num) || num < -180 || num > 180 ? null : num;
  }).optional(),
  
  // Media
  image: z.string().url().max(2000).optional(),
  images: z.array(z.string().url().max(2000)).optional(),
  propertyImages: z.array(z.string().url().max(2000)).optional(),
  
  // URLs
  url: z.string().url().max(2000).optional(),
  propertyUrl: z.string().url().max(2000).optional(),
  
  // Size
  size: z.object({
    max: z.union([z.number(), z.string()]).optional(),
  }).optional(),
  
}).passthrough(); // Allow additional fields but validate known ones

export type ScrapedProperty = z.infer<typeof ScrapedPropertySchema>;

// Validate a single property
export function validateProperty(data: any): { valid: true; data: ScrapedProperty } | { valid: false; error: string } {
  try {
    const validated = ScrapedPropertySchema.parse(data);
    return { valid: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ') };
    }
    return { valid: false, error: 'Unknown validation error' };
  }
}

// Validate and filter an array of properties
export function validateProperties(properties: any[]): {
  valid: ScrapedProperty[];
  invalid: Array<{ data: any; error: string }>;
} {
  const valid: ScrapedProperty[] = [];
  const invalid: Array<{ data: any; error: string }> = [];
  
  for (const prop of properties) {
    const result = validateProperty(prop);
    if (result.valid) {
      valid.push(result.data);
    } else {
      invalid.push({ data: prop, error: result.error });
      console.warn(`Property validation failed: ${result.error}`);
    }
  }
  
  console.log(`Validation: ${valid.length} valid, ${invalid.length} invalid out of ${properties.length} total`);
  
  return { valid, invalid };
}
