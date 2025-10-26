import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IngestRequest {
  url: string;
  maxResults?: number;
}

interface IngestSuccess {
  ok: true;
  site: 'zoopla' | 'rightmove';
  runId: string;
  datasetId: string;
  items: any[];
  itemCount: number;
}

interface IngestError {
  ok: false;
  error: 'missing_url' | 'unsupported_site' | 'apify_start_failed' | 'no_dataset' | 'no_items' | 'polling_timeout' | 'server_error';
  details: Record<string, any>;
}

type IngestResponse = IngestSuccess | IngestError;

// URL normalization and validation
function normalizeUrl(rawUrl: string): URL | null {
  try {
    const url = new URL(rawUrl.trim());
    if (!['http:', 'https:'].includes(url.protocol)) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

// Site detection
function detectSite(url: URL): 'zoopla' | 'rightmove' | null {
  const hostname = url.hostname.toLowerCase();
  if (hostname.includes('zoopla.co.uk')) return 'zoopla';
  if (hostname.includes('rightmove.co.uk')) return 'rightmove';
  return null;
}

// Actor configuration
const ACTOR_CONFIG = {
  rightmove: {
    actorId: 'yyyyuaYekB0HQkfoy',
    buildPayload: (url: URL, maxResults: number, fullDetails: boolean) => ({
      startUrls: [url.toString()],
      maxItems: maxResults,
      fullPropertyDetails: fullDetails,
      monitoringMode: false,
      proxy: {
        useApifyProxy: true,
        apifyProxyGroups: ['RESIDENTIAL'],
        apifyProxyCountry: 'GB'
      }
    })
  },
  zoopla: {
    actorId: 'dhrumil/zoopla-scraper',
    buildPayload: (url: URL, maxResults: number, fullDetails: boolean) => ({
      listUrls: [{ url: url.toString() }],
      maxItems: maxResults,
      fullPropertyDetails: fullDetails,
      monitoringMode: false,
      proxy: {
        useApifyProxy: true,
        apifyProxyGroups: ['RESIDENTIAL'],
        apifyProxyCountry: 'GB'
      }
    })
  }
};

// Start Apify run with retry logic
async function startApifyRun(
  site: 'zoopla' | 'rightmove',
  url: URL,
  maxResults: number,
  apifyApiKey: string
): Promise<{ runId: string; datasetId?: string } | IngestError> {
  const config = ACTOR_CONFIG[site];
  const actorId = site === 'zoopla' ? config.actorId.replace('/', '~') : config.actorId;
  
  // First attempt with full details
  let fullDetails = true;
  let memory = 2048;
  let timeout = 300;
  
  for (let attempt = 0; attempt < 2; attempt++) {
    const payload = config.buildPayload(url, maxResults, fullDetails);
    const runUrl = `https://api.apify.com/v2/acts/${actorId}/runs?token=${apifyApiKey}&waitForFinish=1&memory=${memory}&timeout=${timeout}`;
    
    console.log(JSON.stringify({
      event: 'apify_start_attempt',
      attempt: attempt + 1,
      site,
      fullDetails,
      memory,
      timeout,
      payload
    }));
    
    try {
      const response = await fetch(runUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apifyApiKey}`
        },
        body: JSON.stringify(payload)
      });
      
      const responseData = await response.json();
      
      if (response.ok && responseData.data?.id) {
        console.log(JSON.stringify({
          event: 'apify_start_success',
          runId: responseData.data.id,
          datasetId: responseData.data.defaultDatasetId,
          attempt: attempt + 1
        }));
        
        return {
          runId: responseData.data.id,
          datasetId: responseData.data.defaultDatasetId
        };
      }
      
      // Check if we should retry with reduced settings
      const status = response.status;
      if ((status === 402 || status === 429) && attempt === 0) {
        console.log(JSON.stringify({
          event: 'apify_quota_error_retry',
          status,
          responseData,
          nextAttempt: 'reduced_settings'
        }));
        
        // Retry with reduced settings
        fullDetails = false;
        memory = 512;
        timeout = 120;
        continue;
      }
      
      // Failed and no retry available
      console.error(JSON.stringify({
        event: 'apify_start_failed',
        status,
        responseData
      }));
      
      return {
        ok: false,
        error: 'apify_start_failed',
        details: {
          status,
          message: responseData.error?.message || 'Failed to start Apify run',
          response: responseData
        }
      };
      
    } catch (error) {
      console.error(JSON.stringify({
        event: 'apify_start_exception',
        attempt: attempt + 1,
        error: error instanceof Error ? error.message : String(error)
      }));
      
      if (attempt === 1) {
        return {
          ok: false,
          error: 'apify_start_failed',
          details: {
            message: error instanceof Error ? error.message : 'Network error'
          }
        };
      }
    }
  }
  
  return {
    ok: false,
    error: 'apify_start_failed',
    details: { message: 'All retry attempts exhausted' }
  };
}

// Poll for dataset with timeout
async function pollForDataset(
  runId: string,
  apifyApiKey: string,
  maxSeconds: number = 120
): Promise<{ datasetId: string; status: string } | IngestError> {
  const startTime = Date.now();
  const maxTime = maxSeconds * 1000;
  let pollCount = 0;
  
  while (Date.now() - startTime < maxTime) {
    pollCount++;
    
    try {
      const response = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}`,
        { headers: { Authorization: `Bearer ${apifyApiKey}` } }
      );
      
      if (!response.ok) {
        console.error(JSON.stringify({
          event: 'poll_error',
          pollCount,
          status: response.status
        }));
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }
      
      const data = await response.json();
      const status = data.data?.status;
      const datasetId = data.data?.defaultDatasetId;
      
      console.log(JSON.stringify({
        event: 'poll_status',
        pollCount,
        status,
        datasetId,
        elapsedSeconds: Math.round((Date.now() - startTime) / 1000)
      }));
      
      if (status === 'SUCCEEDED' && datasetId) {
        return { datasetId, status };
      }
      
      if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
        return {
          ok: false,
          error: 'apify_start_failed',
          details: {
            status,
            message: `Apify run ${status.toLowerCase()}`
          }
        };
      }
      
    } catch (error) {
      console.error(JSON.stringify({
        event: 'poll_exception',
        pollCount,
        error: error instanceof Error ? error.message : String(error)
      }));
    }
    
    await new Promise(r => setTimeout(r, 5000));
  }
  
  return {
    ok: false,
    error: 'polling_timeout',
    details: {
      message: `Polling timed out after ${maxSeconds}s`,
      pollCount
    }
  };
}

// Fetch dataset items
async function fetchDatasetItems(
  datasetId: string,
  apifyApiKey: string
): Promise<any[] | IngestError> {
  try {
    const response = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&format=json`,
      { headers: { Authorization: `Bearer ${apifyApiKey}` } }
    );
    
    if (!response.ok) {
      return {
        ok: false,
        error: 'no_items',
        details: {
          status: response.status,
          message: 'Failed to fetch dataset items'
        }
      };
    }
    
    const items = await response.json();
    
    if (!Array.isArray(items) || items.length === 0) {
      return {
        ok: false,
        error: 'no_items',
        details: { message: 'Dataset is empty or invalid format' }
      };
    }
    
    console.log(JSON.stringify({
      event: 'dataset_fetched',
      itemCount: items.length
    }));
    
    return items;
    
  } catch (error) {
    return {
      ok: false,
      error: 'no_items',
      details: {
        message: error instanceof Error ? error.message : 'Failed to fetch items'
      }
    };
  }
}

// Main handler
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apifyApiKey = Deno.env.get('APIFY_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!apifyApiKey || !supabaseUrl || !supabaseKey) {
      const error: IngestError = {
        ok: false,
        error: 'server_error',
        details: { message: 'Missing required environment variables' }
      };
      return new Response(JSON.stringify(error), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body: IngestRequest = await req.json();
    
    // Validate URL
    if (!body.url) {
      const error: IngestError = {
        ok: false,
        error: 'missing_url',
        details: { message: 'URL parameter is required' }
      };
      return new Response(JSON.stringify(error), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Normalize URL
    const normalizedUrl = normalizeUrl(body.url);
    if (!normalizedUrl) {
      const error: IngestError = {
        ok: false,
        error: 'missing_url',
        details: { message: 'Invalid URL format. Must be http or https.' }
      };
      return new Response(JSON.stringify(error), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Detect site
    const site = detectSite(normalizedUrl);
    if (!site) {
      const error: IngestError = {
        ok: false,
        error: 'unsupported_site',
        details: {
          message: 'URL must be from zoopla.co.uk or rightmove.co.uk',
          url: normalizedUrl.toString()
        }
      };
      return new Response(JSON.stringify(error), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const maxResults = body.maxResults || 50;
    
    console.log(JSON.stringify({
      event: 'ingest_start',
      site,
      url: normalizedUrl.toString(),
      maxResults
    }));
    
    // Start Apify run with retry
    const startResult = await startApifyRun(site, normalizedUrl, maxResults, apifyApiKey);
    if ('error' in startResult) {
      return new Response(JSON.stringify(startResult), {
        status: startResult.details.status === 402 ? 402 : startResult.details.status === 429 ? 429 : 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const { runId, datasetId: initialDatasetId } = startResult;
    
    // Poll for dataset if not immediately available
    let datasetId = initialDatasetId;
    if (!datasetId) {
      const pollResult = await pollForDataset(runId, apifyApiKey);
      if ('error' in pollResult) {
        return new Response(JSON.stringify(pollResult), {
          status: 504,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      datasetId = pollResult.datasetId;
    }
    
    // Fetch items
    const itemsResult = await fetchDatasetItems(datasetId, apifyApiKey);
    if ('error' in itemsResult) {
      return new Response(JSON.stringify(itemsResult), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Success response
    const success: IngestSuccess = {
      ok: true,
      site,
      runId,
      datasetId,
      items: itemsResult,
      itemCount: itemsResult.length
    };
    
    console.log(JSON.stringify({
      event: 'ingest_complete',
      site,
      runId,
      datasetId,
      itemCount: itemsResult.length
    }));
    
    // Trigger background import
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      fetch(`${supabaseUrl}/functions/v1/apify-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          runId,
          datasetId,
          source: site,
          location: normalizedUrl.searchParams.get('searchLocation') || normalizedUrl.searchParams.get('q') || ''
        })
      }).catch(() => {});
    } catch (_) {}
    
    return new Response(JSON.stringify(success), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error(JSON.stringify({
      event: 'ingest_exception',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }));
    
    const errorResponse: IngestError = {
      ok: false,
      error: 'server_error',
      details: {
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
