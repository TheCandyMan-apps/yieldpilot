import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const APIFY_API_KEY = Deno.env.get('APIFY_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!APIFY_API_KEY) {
      throw new Error('APIFY_API_KEY not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { actorId, input } = await req.json();
    
    if (!actorId) {
      throw new Error('actorId is required');
    }

    const location = input?.location || 'London';
    console.log('Starting Apify Rightmove actor run:', actorId, 'Location:', location);

    // Format actor ID for API (replace / with ~)
    const formattedActorId = actorId.replace('/', '~');

    // Prepare input with location search
    const actorInput = {
      ...input,
      startUrls: [`https://www.rightmove.co.uk/property-for-sale/find.html?searchLocation=${encodeURIComponent(location)}`],
    };

    // Start the actor run
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/${formattedActorId}/runs`,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${APIFY_API_KEY}`,
        },
        body: JSON.stringify(actorInput),
      }
    );

    if (!runResponse.ok) {
      const errorText = await runResponse.text();
      console.error('Failed to start Apify run:', errorText);
      throw new Error(`Failed to start Apify run: ${errorText}`);
    }

    const runData = await runResponse.json();
    const runId = runData.data.id;
    const defaultDatasetId = runData.data.defaultDatasetId;
    
    console.log('Run started:', runId, 'Dataset:', defaultDatasetId);

    // Poll for completion (max 5 minutes)
    let status = 'RUNNING';
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5-second intervals

    while (status === 'RUNNING' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const statusResponse = await fetch(
        `https://api.apify.com/v2/acts/${formattedActorId}/runs/${runId}`,
        { headers: { 'Authorization': `Bearer ${APIFY_API_KEY}` } }
      );
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        status = statusData.data.status;
        console.log('Run status:', status);
      }
      
      attempts++;
    }

    if (status !== 'SUCCEEDED') {
      console.warn('Run did not complete successfully. Status:', status);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Run timed out or failed',
          status,
          runId 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch dataset items
    console.log('Fetching dataset items from:', defaultDatasetId);
    const datasetResponse = await fetch(
      `https://api.apify.com/v2/datasets/${defaultDatasetId}/items?format=json`,
      { headers: { 'Authorization': `Bearer ${APIFY_API_KEY}` } }
    );

    if (!datasetResponse.ok) {
      throw new Error('Failed to fetch dataset items');
    }

    const properties = await datasetResponse.json();
    console.log('Fetched Rightmove properties:', properties.length);

    // Transform and insert into deals_feed
    const dealsToInsert = properties.map((prop: any) => ({
      property_address: prop.address?.displayAddress || prop.propertyAddress || 'Unknown Address',
      postcode: prop.address?.postcode || null,
      city: prop.address?.town || prop.address?.city || null,
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
    }));

    // Filter out invalid entries
    const validDeals = dealsToInsert.filter((deal: any) => 
      deal.price > 0 && deal.property_address !== 'Unknown Address'
    );

    if (validDeals.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No valid properties to import',
          inserted: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: insertedDeals, error: insertError } = await supabase
      .from('deals_feed')
      .insert(validDeals)
      .select();

    if (insertError) {
      console.error('Error inserting deals:', insertError);
      throw insertError;
    }

    console.log('Successfully inserted Rightmove deals:', insertedDeals?.length);

    return new Response(
      JSON.stringify({ 
        success: true, 
        inserted: insertedDeals?.length,
        runId,
        status 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-apify-rightmove:', error);
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
  // Rough estimate: 0.4% of property value per month
  return Math.round(price * 0.004);
}

function calculateYield(price: number, rent: number): number {
  if (!price || !rent) return 0;
  return parseFloat(((rent * 12 / price) * 100).toFixed(2));
}

function calculateROI(price: number): number {
  // Simplified ROI calculation
  const deposit = price * 0.25;
  const annualAppreciation = price * 0.03;
  return parseFloat(((annualAppreciation / deposit) * 100).toFixed(2));
}

function calculateCashFlow(price: number, rent: number): number {
  if (!price || !rent) return 0;
  
  const mortgage = (price * 0.75) * 0.05 / 12; // 75% LTV, 5% interest
  const expenses = rent * 0.2; // 20% for expenses
  
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