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
    const { location, maxResults = 50, userId } = await req.json();
    
    console.log('Starting Zoopla sync for location:', location);

    if (!location) {
      throw new Error('Location parameter is required');
    }

    const actorId = 'dhrumil/zoopla-scraper';
    const formattedActorId = actorId.replace('/', '~');
    
    // Build the correct Zoopla listUrl
    const isPostcode = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d?[A-Z]{0,2}$/i.test(location.trim());
    const zooplaUrl = isPostcode 
      ? `https://www.zoopla.co.uk/for-sale/property/${encodeURIComponent(location)}/?search_source=for-sale&radius=0`
      : `https://www.zoopla.co.uk/for-sale/property/?q=${encodeURIComponent(location)}&search_source=for-sale&radius=0`;
    
    console.log('Zoopla listUrl:', zooplaUrl);

    const webhookUrl = `${supabaseUrl}/functions/v1/apify-webhook?source=zoopla&location=${encodeURIComponent(location)}&userId=${userId || ''}`;
    console.log('Webhook URL:', webhookUrl);

    // Construct webhook configuration
    const webhooks = [{
      eventTypes: ["ACTOR.RUN.SUCCEEDED"],
      requestUrl: webhookUrl
    }];

    const webhooksParam = btoa(JSON.stringify(webhooks));

    const apifyRunUrl = `https://api.apify.com/v2/acts/${formattedActorId}/runs?webhooks=${encodeURIComponent(webhooksParam)}&timeout=900&memory=4096`;
    
    const runResponse = await fetch(apifyRunUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apifyApiKey}`,
      },
      body: JSON.stringify({
        listUrls: [
          { url: zooplaUrl },
          { url: `https://www.zoopla.co.uk/for-sale/property/?q=${encodeURIComponent(location)}&search_source=for-sale&radius=0` }
        ],
        fullPropertyDetails: true,
        monitoringMode: false,
        maxProperties: maxResults,
        proxy: {
          useApifyProxy: true,
          apifyProxyGroups: ['RESIDENTIAL'],
          apifyProxyCountry: 'GB'
        }
      }),
    });

    if (!runResponse.ok) {
      const errorText = await runResponse.text();
      console.error('Apify API error:', errorText);
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

    // Trigger importer function in background
    try {
      fetch(`${supabaseUrl}/functions/v1/apify-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ runId, source: 'zoopla', location, userId })
      }).catch(() => {});
    } catch (_) {}

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
