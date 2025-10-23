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
    const apifyApiKey = Deno.env.get('APIFY_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!apifyApiKey || !supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { location, maxResults = 50 } = await req.json();
    
    console.log('Starting Zoopla sync for location:', location);

    if (!location) {
      throw new Error('Location parameter is required');
    }

    const actorId = 'dhrumil/zoopla-scraper';
    
    // Build the correct Zoopla listUrl based on input
    // If it looks like a postcode (KT22, GU1, etc.), use it directly
    // Otherwise treat it as a location query
    const isPostcode = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d?[A-Z]{0,2}$/i.test(location.trim());
    const zooplaUrl = isPostcode 
      ? `https://www.zoopla.co.uk/for-sale/property/${encodeURIComponent(location)}/?search_source=for-sale&radius=0`
      : `https://www.zoopla.co.uk/for-sale/property/?q=${encodeURIComponent(location)}&search_source=for-sale&radius=0`;
    
    console.log('Zoopla listUrl:', zooplaUrl);

    // Set up webhook to call our apify-webhook function when the run completes
    const webhookUrl = `${supabaseUrl}/functions/v1/apify-webhook`;
    
    console.log('Starting Apify actor:', actorId);
    console.log('Webhook URL:', webhookUrl);

    const apifyRunUrl = `https://api.apify.com/v2/acts/${actorId}/runs?token=${apifyApiKey}&webhooks=[{\"eventTypes\":[\"ACTOR.RUN.SUCCEEDED\"],\"requestUrl\":\"${encodeURIComponent(webhookUrl)}\"}]`;
    
    const runResponse = await fetch(apifyRunUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        listUrls: [{ url: zooplaUrl }],
        fullPropertyDetails: false,
        monitoringMode: false,
        maxItems: maxResults,
        maxResults: maxResults,
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
    console.log('Actor input:', JSON.stringify({ listUrls: [{ url: zooplaUrl }], fullPropertyDetails: false, maxItems: maxResults }));

    // Background fallback importer in case webhook delivery fails
    async function importFromApify(runId: string, dsId?: string) {
      try {
        let effectiveDatasetId = dsId;
        console.log('Polling Apify run for completion (zoopla)...');
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
          console.warn('No datasetId available after polling; aborting fallback import (zoopla)');
          return;
        }

        console.log('Fallback import (zoopla): fetching dataset', effectiveDatasetId);
      } catch (e) {
        console.error('Fallback import (zoopla) error:', e);
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
        body: JSON.stringify({ runId, datasetId, source: 'zoopla', location })
      }).catch(() => {});
    } catch (_) {}

    // Still schedule local fallback when available
    // @ts-ignore
    EdgeRuntime?.waitUntil?.(importFromApify(runId, datasetId));

    return new Response(
      JSON.stringify({ 
        message: 'Zoopla sync started',
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
    console.error('Error in sync-apify-zoopla:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
