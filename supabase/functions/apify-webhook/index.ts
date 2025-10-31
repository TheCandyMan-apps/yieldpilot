// Webhook endpoint for Apify to call when scraping is complete
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { validateProperties } from "../_shared/validation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-apify-signature',
};

// HMAC signature verification
async function verifyApifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  
  const signatureBuffer = Uint8Array.from(
    signature.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
  );
  
  return await crypto.subtle.verify(
    'HMAC',
    key,
    signatureBuffer,
    encoder.encode(body)
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const APIFY_API_KEY = Deno.env.get('APIFY_API_KEY');
    const APIFY_WEBHOOK_SECRET = Deno.env.get('APIFY_WEBHOOK_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!APIFY_API_KEY) {
      throw new Error('APIFY_API_KEY not configured');
    }

    if (!APIFY_WEBHOOK_SECRET) {
      console.warn('⚠️ APIFY_WEBHOOK_SECRET not configured - webhook signature verification disabled');
    }

    // Verify webhook signature if secret is configured
    if (APIFY_WEBHOOK_SECRET) {
      const signature = req.headers.get('x-apify-signature');
      const body = await req.text();
      
      if (!signature) {
        return new Response(
          JSON.stringify({ error: 'Missing webhook signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const isValid = await verifyApifySignature(body, signature, APIFY_WEBHOOK_SECRET);
      if (!isValid) {
        console.error('❌ Invalid webhook signature');
        return new Response(
          JSON.stringify({ error: 'Invalid webhook signature' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ Webhook signature verified');
      var raw = JSON.parse(body);
    } else {
      var raw = await req.json();
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Extract and validate source from query params
    const url = new URL(req.url);
    const source = url.searchParams.get('source');
    const location = url.searchParams.get('location');
    const userId = url.searchParams.get('userId');

    console.log(`📥 Webhook called: source=${source}, location=${location}, userId=${userId}`);

    // Validate source against whitelist
    const ALLOWED_SOURCES = ['rightmove', 'zoopla'];
    if (!source || !ALLOWED_SOURCES.includes(source)) {
      throw new Error(`Invalid source. Must be one of: ${ALLOWED_SOURCES.join(', ')}`);
    }

    console.log('📥 Webhook payload received:', JSON.stringify(raw, null, 2));
    
    // Extract runId and datasetId from Apify's native webhook payload
    const runId: string | undefined = raw.resource?.id || raw.id;
    let effectiveDatasetId: string | undefined = raw.resource?.defaultDatasetId || raw.defaultDatasetId;

    // Poll for dataset if not immediately available
    if (!effectiveDatasetId && runId) {
      console.log(`Webhook missing datasetId; polling run ${runId} for dataset...`);
      for (let i = 0; i < 20; i++) { // ~100s max
        const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, { 
          headers: { Authorization: `Bearer ${APIFY_API_KEY}` } 
        });
        const statusJson = await statusRes.json();
        const status = statusJson.data?.status;
        effectiveDatasetId = statusJson.data?.defaultDatasetId || effectiveDatasetId;
        if (status === 'SUCCEEDED' && effectiveDatasetId) break;
        await new Promise((r) => setTimeout(r, 5000));
      }
    }

    if (!effectiveDatasetId) {
      throw new Error('Unable to resolve datasetId from webhook payload or run status');
    }

    console.log(`📥 Webhook received: ${source} dataset ${effectiveDatasetId} from run ${runId}`);

    // Fetch dataset items
    const datasetResponse = await fetch(
      `https://api.apify.com/v2/datasets/${effectiveDatasetId}/items?format=json`,
      { headers: { Authorization: `Bearer ${APIFY_API_KEY}` } }
    );

    if (!datasetResponse.ok) {
      const errText = await datasetResponse.text();
      console.error('Failed to fetch dataset items:', datasetResponse.status, errText);
      throw new Error('Failed to fetch dataset items');
    }

    const properties = await datasetResponse.json();
    console.log(`✓ Fetched ${properties.length} properties from ${source}`);

    if (!Array.isArray(properties) || properties.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No properties to import', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform data based on source - with validation
    const { valid: validDeals, invalid: invalidDeals } = validateProperties(properties);
    
    console.log(`Validation: ${validDeals.length} valid, ${invalidDeals.length} invalid out of ${properties.length} total`);
    
    const dealsToInsert = validDeals.map((prop: any) => {
      if (source === 'rightmove') {
        const address = prop.address?.displayAddress || prop.propertyAddress || 'Unknown Address';
        const extractedCity = extractCityFromAddress(address, prop.address?.town, prop.address?.city);
        return {
          property_address: address,
          postcode: prop.address?.postcode || null,
          city: extractedCity,
          property_type: mapPropertyType(prop.propertySubType || prop.propertyType),
          price: parsePrice(prop.price?.amount || prop.price),
          estimated_rent: estimateRent(parsePrice(prop.price?.amount || prop.price)),
          bedrooms: parseInt(prop.bedrooms) || null,
          bathrooms: parseInt(prop.bathrooms) || null,
          square_feet: prop.size?.max ? parseInt(prop.size.max) : null,
          image_url: prop.propertyImages?.[0] || prop.images?.[0] || null,
          listing_url: prop.propertyUrl || prop.url || null,
          location_lat: prop.location?.latitude ? parseFloat(prop.location.latitude) : null,
          location_lng: prop.location?.longitude ? parseFloat(prop.location.longitude) : null,
          source: 'apify-rightmove',
          is_active: true,
          yield_percentage: calculateYield(parsePrice(prop.price?.amount || prop.price), estimateRent(parsePrice(prop.price?.amount || prop.price))),
          roi_percentage: calculateROI(parsePrice(prop.price?.amount || prop.price)),
          cash_flow_monthly: calculateCashFlow(parsePrice(prop.price?.amount || prop.price), estimateRent(parsePrice(prop.price?.amount || prop.price))),
          investment_score: calculateScore(parsePrice(prop.price?.amount || prop.price)),
        };
      } else {
        // Zoopla format
        const address = prop.address || prop.displayAddress || prop.title || 'Unknown Address';
        const extractedCity = extractCityFromAddress(address, prop.city, prop.county, prop.location);
        return {
          property_address: address,
          postcode: prop.postcode || null,
          city: extractedCity,
          property_type: mapPropertyType(prop.propertyType),
          price: parsePrice(prop.price),
          estimated_rent: estimateRent(parsePrice(prop.price)),
          bedrooms: parseInt(prop.bedrooms) || null,
          bathrooms: parseInt(prop.bathrooms) || null,
          square_feet: null,
          image_url: prop.image || prop.images?.[0] || null,
          listing_url: prop.url || null,
          location_lat: prop.latitude ? parseFloat(prop.latitude) : null,
          location_lng: prop.longitude ? parseFloat(prop.longitude) : null,
          source: 'apify-zoopla',
          is_active: true,
          yield_percentage: calculateYield(parsePrice(prop.price), estimateRent(parsePrice(prop.price))),
          roi_percentage: calculateROI(parsePrice(prop.price)),
          cash_flow_monthly: calculateCashFlow(parsePrice(prop.price), estimateRent(parsePrice(prop.price))),
          investment_score: calculateScore(parsePrice(prop.price)),
        };
      }
    });

    const finalDeals = dealsToInsert.filter((deal: any) => deal.price > 0 && deal.property_address !== 'Unknown Address');
    console.log(`Final valid properties: ${finalDeals.length}/${dealsToInsert.length}`);

    if (finalDeals.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No valid properties after filtering', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert into database
    const { error: insertError } = await supabase
      .from('deals_feed')
      .insert(finalDeals);

    if (insertError) {
      console.error('Database insertion error:', insertError);
      throw insertError;
    }

    console.log(`✅ Imported ${finalDeals.length} deals from ${source}`);

    return new Response(
      JSON.stringify({ success: true, count: finalDeals.length, source }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in apify-webhook:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Helper functions
function extractCityFromAddress(address: string, ...fallbacks: any[]): string | null {
  // Try fallback values first
  for (const fallback of fallbacks) {
    if (fallback && typeof fallback === 'string' && fallback.trim()) {
      return fallback.trim();
    }
  }
  
  // Extract from address string - look for known patterns
  const parts = address.split(',').map(p => p.trim());
  
  // Look for common UK cities/counties in the address
  const ukLocations = ['London', 'Manchester', 'Birmingham', 'Leeds', 'Liverpool', 'Bristol', 
    'Sheffield', 'Surrey', 'Kent', 'Essex', 'Sussex', 'Hampshire', 'Berkshire', 'Middlesex',
    'Westminster', 'Camden', 'Kensington', 'Chelsea'];
  
  for (const part of parts) {
    for (const location of ukLocations) {
      if (part.toLowerCase().includes(location.toLowerCase())) {
        return location;
      }
    }
  }
  
  // Return the second-to-last part if it exists (often the city)
  if (parts.length >= 2) {
    const candidate = parts[parts.length - 2];
    if (candidate && !candidate.match(/^[A-Z]{1,2}\d{1,2}/)) { // Not a postcode
      return candidate;
    }
  }
  
  return null;
}

function mapPropertyType(type: string): string {
  const typeMap: Record<string, string> = {
    'flat': 'residential',
    'apartment': 'residential',
    'house': 'residential',
    'bungalow': 'residential',
    'maisonette': 'residential',
    'detached': 'residential',
    'semi-detached': 'residential',
    'terraced': 'residential',
    'end-terrace': 'residential',
    'studio': 'residential',
    'land': 'land',
    'commercial': 'commercial',
    'business': 'commercial',
    'office': 'commercial',
  };
  
  const lowered = type?.toLowerCase() || '';
  return typeMap[lowered] || 'residential';
}

function parsePrice(priceStr: string | number): number {
  if (typeof priceStr === 'number') return priceStr;
  if (!priceStr) return 0;
  
  const cleaned = priceStr.toString().replace(/[£,\s]/g, '');
  return parseFloat(cleaned) || 0;
}

function estimateRent(price: number): number {
  return Math.round(price * 0.004);
}

function calculateYield(price: number, rent: number): number {
  if (!price || !rent) return 0;
  return parseFloat(((rent * 12 / price) * 100).toFixed(2));
}

function calculateROI(price: number): number {
  const deposit = price * 0.25;
  const annualAppreciation = price * 0.03;
  return parseFloat(((annualAppreciation / deposit) * 100).toFixed(2));
}

function calculateCashFlow(price: number, rent: number): number {
  if (!price || !rent) return 0;
  
  const mortgage = (price * 0.75) * 0.05 / 12;
  const expenses = rent * 0.2;
  
  return Math.round(rent - mortgage - expenses);
}

function calculateScore(price: number): string {
  const yieldPct = (estimateRent(price) * 12 / price) * 100;
  
  if (yieldPct >= 8) return 'A';
  if (yieldPct >= 6) return 'B';
  if (yieldPct >= 4) return 'C';
  if (yieldPct >= 2) return 'D';
  return 'E';
}
