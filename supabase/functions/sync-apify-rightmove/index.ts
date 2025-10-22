// Using Deno.serve; removed std http serve import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
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
    console.log('Starting Apify Rightmove run:', actorId, 'Location:', location);

    // Determine if provided ID is an Actor slug (user/actor) or a Task ID
    const isTask = !actorId.includes('/');
    const formattedActorId = isTask ? actorId : actorId.replace('/', '~');

    // Webhook URL for Apify to call when done
    const webhookUrl = `${SUPABASE_URL}/functions/v1/apify-webhook`;

    // Prepare input with location search
    const actorInput = {
      ...input,
      startUrls: [`https://www.rightmove.co.uk/property-for-sale/find.html?searchLocation=${encodeURIComponent(location)}`],
    };

    // Construct webhook configuration
    const webhooks = [{
      eventTypes: ["ACTOR.RUN.SUCCEEDED"],
      requestUrl: webhookUrl,
      payloadTemplate: JSON.stringify({
        datasetId: "{{resource.defaultDatasetId}}",
        source: "rightmove",
        runId: "{{resource.id}}"
      })
    }];

    // Apify expects Base64-encoded JSON for the `webhooks` query param
    const webhooksParam = btoa(JSON.stringify(webhooks));

    // Start the run (Actor or Task) with webhook
    const memory = input?.memoryMB ?? 2048;
    const timeout = input?.timeoutSec ?? 900;
    const runUrl = isTask
      ? `https://api.apify.com/v2/actor-tasks/${formattedActorId}/runs?memory=${memory}&timeout=${timeout}&webhooks=${encodeURIComponent(webhooksParam)}`
      : `https://api.apify.com/v2/acts/${formattedActorId}/runs?memory=${memory}&timeout=${timeout}&webhooks=${encodeURIComponent(webhooksParam)}`;

    const runResponse = await fetch(
      runUrl,
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
    let datasetId: string | undefined = runData.data.defaultDatasetId;
    
    console.log('✓ Rightmove run started with webhook');
    console.log(`  Run ID: ${runId}`);
    if (datasetId) console.log(`  Dataset ID: ${datasetId}`);
    console.log(`  View run: https://console.apify.com/actors/runs/${runId}`);
    console.log(`  Webhook will call back when complete`);

    // Background fallback importer in case webhook delivery fails
    async function importFromApify(runId: string, dsId?: string) {
      try {
        let effectiveDatasetId = dsId;
        console.log('Polling Apify run for completion...');
        for (let i = 0; i < 40; i++) { // up to ~200s
          const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, { headers: { Authorization: `Bearer ${APIFY_API_KEY}` } });
          const statusJson = await statusRes.json();
          const status = statusJson.data?.status;
          effectiveDatasetId = statusJson.data?.defaultDatasetId || effectiveDatasetId;
          if (status === 'SUCCEEDED' && effectiveDatasetId) break;
          await new Promise((r) => setTimeout(r, 5000));
        }

        if (!effectiveDatasetId) {
          console.warn('No datasetId available after polling; aborting fallback import');
          return;
        }

        console.log('Fallback import: fetching dataset', effectiveDatasetId);
        const datasetResponse = await fetch(
          `https://api.apify.com/v2/datasets/${effectiveDatasetId}/items?format=json`,
          { headers: { Authorization: `Bearer ${APIFY_API_KEY}` } }
        );
        if (!datasetResponse.ok) {
          console.error('Fallback import: failed to fetch dataset items');
          return;
        }
        const properties = await datasetResponse.json();
        console.log(`Fallback import: got ${properties.length} items`);

        if (!Array.isArray(properties) || properties.length === 0) return;

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

        const validDeals = dealsToInsert.filter((d: any) => d.price > 0 && d.property_address !== 'Unknown Address');
        if (validDeals.length === 0) return;

        const { error: insertError } = await supabase
          .from('deals_feed')
          .insert(validDeals);
        if (insertError) {
          console.error('Fallback import: DB insert error', insertError);
        } else {
          console.log(`Fallback import: inserted ${validDeals.length} deals (rightmove)`);
        }
      } catch (e) {
        console.error('Fallback import error:', e);
      }
    }

    // Trigger importer function in background (more reliable than waitUntil)
    try {
      fetch(`${SUPABASE_URL}/functions/v1/apify-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ runId, datasetId, source: 'rightmove' })
      }).catch(() => {});
    } catch (_) {}

    // Still schedule local fallback when available
    // @ts-ignore - Edge runtime helper available
    EdgeRuntime?.waitUntil?.(importFromApify(runId, datasetId));

    // Respond immediately
    return new Response(
      JSON.stringify({
        started: true,
        source: 'rightmove',
        runId,
        runUrl: `https://console.apify.com/actors/runs/${runId}`,
        message: 'Rightmove sync started. Data will appear automatically when ready.'
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