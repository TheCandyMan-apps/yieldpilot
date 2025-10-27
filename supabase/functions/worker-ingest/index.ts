import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APIFY_BASE = 'https://api.apify.com/v2';
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX = 10; // max 10 runs per minute

interface ApifyRunResponse {
  data: {
    id: string;
    defaultDatasetId?: string;
    status: string;
  };
}

interface ApifyItem {
  url?: string;
  title?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
  images?: string[];
  description?: string;
  address?: string;
}

// Check and update rate limit
async function checkRateLimit(supabase: any): Promise<boolean> {
  const key = 'apify_ingestion';
  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);

  const { data: limit } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('key', key)
    .single();

  if (!limit) {
    // First request
    await supabase.from('rate_limits').insert({ key, count: 1, window_start: now });
    return true;
  }

  const limitWindowStart = new Date(limit.window_start);
  
  if (now.getTime() - limitWindowStart.getTime() > RATE_LIMIT_WINDOW_MS) {
    // Reset window
    await supabase
      .from('rate_limits')
      .update({ count: 1, window_start: now, updated_at: now })
      .eq('key', key);
    return true;
  }

  if (limit.count >= RATE_LIMIT_MAX) {
    console.log('⚠️ Rate limit exceeded:', limit.count, '/', RATE_LIMIT_MAX);
    return false;
  }

  // Increment count
  await supabase
    .from('rate_limits')
    .update({ count: limit.count + 1, updated_at: now })
    .eq('key', key);
  
  return true;
}

// Start Apify run
async function startApifyRun(
  actor: string,
  input: any,
  token: string,
  opts: { memory?: number; timeout?: number } = {}
): Promise<ApifyRunResponse> {
  const { memory = 512, timeout = 120 } = opts;
  const url = `${APIFY_BASE}/acts/${actor}/runs?token=${token}&waitForFinish=60&memory=${memory}&timeout=${timeout}`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Apify start failed: ${res.status} ${body}`);
  }

  return await res.json();
}

// Poll for dataset ID
async function pollDatasetId(runId: string, token: string, maxPolls = 20): Promise<string | null> {
  const pollInterval = 5000; // 5 seconds
  
  for (let i = 0; i < maxPolls; i++) {
    const res = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${token}`);
    if (!res.ok) throw new Error(`Poll failed: ${res.status}`);
    
    const { data } = await res.json();
    console.log(`📊 Poll ${i + 1}/${maxPolls}: status=${data.status}, datasetId=${data.defaultDatasetId}`);
    
    if (data.status === 'SUCCEEDED' && data.defaultDatasetId) {
      return data.defaultDatasetId;
    }
    
    if (data.status === 'FAILED' || data.status === 'ABORTED') {
      throw new Error(`Run ${data.status}: ${data.statusMessage || 'Unknown error'}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  return null;
}

// Fetch items from dataset
async function fetchItems(datasetId: string, token: string): Promise<ApifyItem[]> {
  const url = `${APIFY_BASE}/datasets/${datasetId}/items?clean=true&format=json&limit=50&token=${token}`;
  const res = await fetch(url);
  
  if (!res.ok) {
    throw new Error(`Dataset fetch failed: ${res.status}`);
  }
  
  return await res.json();
}

// Process a single job
async function processJob(supabase: any, apifyToken: string) {
  // Get next queued job (advisory lock via update)
  const { data: job, error: lockError } = await supabase
    .from('ingest_jobs')
    .update({ status: 'running', updated_at: new Date().toISOString() })
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1)
    .select()
    .single();

  if (lockError || !job) {
    console.log('No queued jobs found');
    return;
  }

  console.log(`🔄 Processing job ${job.id} for ${job.site}: ${job.normalized_url}`);

  try {
    // Check rate limit
    const canProceed = await checkRateLimit(supabase);
    if (!canProceed) {
      await supabase
        .from('ingest_jobs')
        .update({ 
          status: 'failed',
          error: { code: 'rate_limited', message: 'Rate limit exceeded, try again later' },
        })
        .eq('id', job.id);
      return;
    }

    // Determine actor
    const actor = job.site === 'zoopla' 
      ? 'dhrumil/zoopla-scraper'
      : 'dhrumil/rightmove-scraper';

    // Stage 1: Full details
    let input: any;
    if (job.site === 'zoopla') {
      input = {
        startUrls: [{ url: job.normalized_url }],
        fullPropertyDetails: true,
        monitoringMode: false,
      };
    } else {
      input = {
        startUrls: [{ url: job.normalized_url }],
        fullPropertyDetails: true,
      };
    }

    let runResponse: ApifyRunResponse;
    try {
      runResponse = await startApifyRun(actor, input, apifyToken, { memory: 512, timeout: 120 });
    } catch (error: any) {
      // Check if memory/quota error
      if (error.message.includes('memory') || error.message.includes('quota')) {
        await supabase
          .from('ingest_jobs')
          .update({
            status: 'failed',
            error: { code: 'apify_quota', message: error.message },
          })
          .eq('id', job.id);
        return;
      }
      throw error;
    }

    const runId = runResponse.data.id;
    console.log(`🚀 Started run ${runId}`);

    await supabase.from('ingest_jobs').update({ run_id: runId }).eq('id', job.id);

    // Poll for dataset
    const datasetId = await pollDatasetId(runId, apifyToken);
    if (!datasetId) {
      await supabase
        .from('ingest_jobs')
        .update({
          status: 'failed',
          error: { code: 'timeout', message: 'Dataset polling timed out' },
        })
        .eq('id', job.id);
      return;
    }

    console.log(`📦 Dataset ID: ${datasetId}`);
    await supabase.from('ingest_jobs').update({ dataset_id: datasetId }).eq('id', job.id);

    // Fetch items
    const items = await fetchItems(datasetId, apifyToken);
    console.log(`✓ Fetched ${items.length} items`);

    if (items.length === 0) {
      // Try Stage 2: basic mode
      console.log('🔄 Retrying with basic mode...');
      
      if (job.site === 'zoopla') {
        input.fullPropertyDetails = false;
      } else {
        input.fullPropertyDetails = false;
      }

      const retryResponse = await startApifyRun(actor, input, apifyToken, { memory: 512, timeout: 120 });
      const retryRunId = retryResponse.data.id;
      
      await supabase.from('ingest_jobs').update({ run_id: retryRunId }).eq('id', job.id);
      
      const retryDatasetId = await pollDatasetId(retryRunId, apifyToken);
      if (!retryDatasetId) {
        await supabase.from('ingest_jobs').update({ status: 'no_items' }).eq('id', job.id);
        return;
      }

      const retryItems = await fetchItems(retryDatasetId, apifyToken);
      if (retryItems.length === 0) {
        await supabase.from('ingest_jobs').update({ status: 'no_items' }).eq('id', job.id);
        return;
      }

      items.push(...retryItems);
    }

    // Upsert items into listings
    const userId = job.created_by;
    const listingsToInsert = items.slice(0, 10).map(item => ({
      user_id: userId,
      property_address: item.address || item.title || 'Unknown',
      price: item.price || 0,
      bedrooms: item.bedrooms,
      bathrooms: item.bathrooms,
      property_type: item.propertyType || 'Unknown',
      listing_url: item.url || job.normalized_url,
      image_url: item.images?.[0],
      source: job.site,
    }));

    const { data: insertedListings, error: insertError } = await supabase
      .from('listings')
      .upsert(listingsToInsert, { onConflict: 'listing_url', ignoreDuplicates: false })
      .select();

    if (insertError) {
      console.error('Failed to insert listings:', insertError);
      await supabase
        .from('ingest_jobs')
        .update({
          status: 'failed',
          error: { code: 'db_insert_failed', message: insertError.message },
        })
        .eq('id', job.id);
      return;
    }

    console.log(`✅ Inserted ${insertedListings?.length || 0} listings`);

    // Mark job as succeeded
    await supabase
      .from('ingest_jobs')
      .update({
        status: 'succeeded',
        listing_id: insertedListings?.[0]?.id,
      })
      .eq('id', job.id);

  } catch (error: any) {
    console.error('Job processing error:', error);
    await supabase
      .from('ingest_jobs')
      .update({
        status: 'failed',
        error: { code: 'processing_error', message: error.message },
      })
      .eq('id', job.id);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const apifyToken = Deno.env.get('APIFY_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Process up to 3 jobs
    const promises = Array(3).fill(null).map(() => processJob(supabase, apifyToken));
    await Promise.allSettled(promises);

    return new Response(
      JSON.stringify({ ok: true, message: 'Worker completed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('worker-ingest error:', error);
    return new Response(
      JSON.stringify({ error: 'internal_error', message: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
