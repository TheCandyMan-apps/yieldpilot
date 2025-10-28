import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { url, region, maxItems = 100 } = await req.json();
    
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auto-detect adapter based on URL
    const adapters = [
      { id: 'zoopla-uk', pattern: 'zoopla.co.uk', region: 'UK', actor: 'maxcopell~zoopla-scraper' },
      { id: 'rightmove-uk', pattern: 'rightmove.co.uk', region: 'UK', actor: 'shanes~rightmove-scraper' },
      { id: 'realtor-us', pattern: 'realtor.com', region: 'US', actor: 'maxcopell~realtorcom-scraper' },
      { id: 'zillow-us', pattern: 'zillow.com', region: 'US', actor: 'maxcopell~zillow-scraper' },
      { id: 'immobilienscout-de', pattern: 'immobilienscout24.de', region: 'DE', actor: 'maxcopell~immobilienscout24-scraper' },
      { id: 'seloger-fr', pattern: 'seloger.com', region: 'FR', actor: 'maxcopell~seloger-scraper' },
    ];

    const adapter = adapters.find(a => url.includes(a.pattern));
    
    if (!adapter) {
      return new Response(JSON.stringify({ error: 'Unsupported site' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const APIFY_API_KEY = Deno.env.get('APIFY_API_KEY');
    if (!APIFY_API_KEY) {
      throw new Error('APIFY_API_KEY not configured');
    }

    // Start Apify run
    const apifyResponse = await fetch(`https://api.apify.com/v2/acts/${adapter.actor}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${APIFY_API_KEY}`,
      },
      body: JSON.stringify({
        startUrls: [{ url }],
        maxItems,
      }),
    });

    if (!apifyResponse.ok) {
      throw new Error(`Apify API error: ${apifyResponse.statusText}`);
    }

    const apifyData = await apifyResponse.json();
    const runId = apifyData.data.id;
    const datasetId = apifyData.data.defaultDatasetId;

    // Create ingest job
    const { data: job, error: jobError } = await supabaseClient
      .from('ingest_jobs')
      .insert({
        input_url: url,
        normalized_url: url,
        site: adapter.id,
        run_id: runId,
        dataset_id: datasetId,
        status: 'running',
        created_by: user.id,
      })
      .select()
      .single();

    if (jobError) throw jobError;

    console.log(`Global ingest started: ${adapter.id} | RunID: ${runId}`);

    return new Response(JSON.stringify({ 
      job,
      adapter: adapter.id,
      region: adapter.region,
      runId,
      datasetId 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Global ingest error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
