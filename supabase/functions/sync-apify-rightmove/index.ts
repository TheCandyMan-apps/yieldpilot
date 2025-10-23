import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apifyApiKey = Deno.env.get('APIFY_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!apifyApiKey || !supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { location, maxResults = 50 } = await req.json();
    
    console.log('Starting Rightmove sync for location:', location);

    if (!location) {
      throw new Error('Location parameter is required');
    }

    const actorId = 'yyyyuaYekB0HQkfoy';
    const rightmoveUrl = `https://www.rightmove.co.uk/property-for-sale/find.html?searchLocation=${encodeURIComponent(location)}`;
    
    console.log('Rightmove URL:', rightmoveUrl);

    // Set up webhook to call our apify-webhook function when the run completes
    const webhookUrl = `${supabaseUrl}/functions/v1/apify-webhook`;
    
    console.log('Starting Apify actor:', actorId);
    console.log('Webhook URL:', webhookUrl);

    const apifyRunUrl = `https://api.apify.com/v2/acts/${actorId}/runs?token=${apifyApiKey}&webhooks=[{"eventTypes":["ACTOR.RUN.SUCCEEDED"],"requestUrl":"${encodeURIComponent(webhookUrl)}"}]`;
    
    const runResponse = await fetch(apifyRunUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startUrls: [{ url: rightmoveUrl }],
        maxItems: maxResults,
        proxy: {
          useApifyProxy: true,
          apifyProxyGroups: ['RESIDENTIAL'],
          apifyProxyCountry: 'GB'
        }
      }),
    });

    if (!runResponse.ok) {
      const errorText = await runResponse.text();
      throw new Error(`Failed to start Apify run: ${errorText}`);
    }

    const runData = await runResponse.json();
    console.log('Apify run started:', runData);

    if (!runData.data?.id) {
      throw new Error('Failed to start Apify run');
    }

    const runId = runData.data.id;
    const datasetId = runData.data.defaultDatasetId;
    const runUrl = `https://console.apify.com/view/runs/${runId}`;

    console.log('Run ID:', runId);
    console.log('Dataset ID:', datasetId);
    console.log('Run URL:', runUrl);

    // Background fallback importer
    async function importFromApify(runId: string, dsId?: string) {
      try {
        let effectiveDatasetId = dsId;
        console.log('Polling Apify run for completion...');
        for (let i = 0; i < 40; i++) {
          const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, { 
            headers: { Authorization: `Bearer ${apifyApiKey}` } 
          });
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
      } catch (e) {
        console.error('Fallback import error:', e);
      }
    }

    // Trigger importer function in background
    try {
      fetch(`${supabaseUrl}/functions/v1/apify-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ runId, datasetId, source: 'rightmove', location })
      }).catch(() => {});
    } catch (_) {}

    // Still schedule local fallback when available
    // @ts-ignore
    EdgeRuntime?.waitUntil?.(importFromApify(runId, datasetId));

    return new Response(
      JSON.stringify({ 
        message: 'Rightmove sync started',
        runId,
        datasetId,
        runUrl,
        location
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in sync-apify-rightmove:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});