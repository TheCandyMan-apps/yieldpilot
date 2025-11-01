import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { checkRateLimit, getRateLimitKey, getClientIp } from '../_shared/rate-limiter.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, parseJsonBody } from '../_shared/api-helpers.ts';
import { validateProperties } from '../_shared/validation.ts';

interface IngestRequest {
  url: string;
  maxResults?: number;
  userId?: string;
}

interface IngestSuccess {
  ok: true;
  site: 'zoopla' | 'rightmove';
  url: string;
  requestId: string;
  runId: string;
  datasetId: string;
  items: any[];
  itemCount: number;
}

interface IngestError {
  ok: false;
  error: 'missing_url' | 'unsupported_site' | 'apify_start_failed' | 'no_dataset' | 'no_items' | 'polling_timeout' | 'server_error';
  requestId?: string;
  site?: string;
  url?: string;
  runId?: string;
  datasetId?: string;
  details: Record<string, any>;
}

type IngestResponse = IngestSuccess | IngestError;

// URL normalization and validation
function normalizeUrl(rawUrl: string): URL | null {
  try {
    let url = rawUrl.trim();
    // Auto-prefix https:// if starts with www.
    if (url.startsWith('www.')) {
      url = 'https://' + url;
    }
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed;
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
    actorId: 'dhrumil/rightmove-scraper',
    buildPayload: (url: URL, maxResults: number, fullDetails: boolean) => ({
      listUrls: [{ url: url.toString() }],
      fullPropertyDetails: fullDetails,
      monitoringMode: false,
      maxProperties: maxResults,
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
      fullPropertyDetails: fullDetails,
      monitoringMode: false,
      maxProperties: maxResults,
      proxy: {
        useApifyProxy: true,
        apifyProxyGroups: ['RESIDENTIAL'],
        apifyProxyCountry: 'GB'
      }
    })
  }
};

// Start Apify run with Stage 1 / Stage 2 retry logic
async function startApifyRun(
  site: 'zoopla' | 'rightmove',
  url: URL,
  maxResults: number,
  apifyApiKey: string,
  supabaseUrl: string,
  requestId: string
): Promise<{ runId: string; datasetId?: string } | IngestError> {
  const config = ACTOR_CONFIG[site];
  const actorId = config.actorId;
  const formattedActorId = actorId.replace('/', '~');
  
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const webhookUrl = `${supabaseUrl}/functions/v1/apify-webhook?apikey=${encodeURIComponent(supabaseAnonKey)}`;
  const webhooks = [{
    eventTypes: ["ACTOR.RUN.SUCCEEDED"],
    requestUrl: webhookUrl,
  }];
  const webhooksParam = btoa(JSON.stringify(webhooks));

  // Stage 1: Full details with appropriate memory
  // Stage 2: Basic mode with reduced resources (if Stage 1 fails with quota/memory)
  const stages = [
    { fullDetails: true, memory: 512, timeout: 120 },
    { fullDetails: false, memory: 512, timeout: 120 }
  ];
  
  for (let stage = 0; stage < stages.length; stage++) {
    const { fullDetails, memory, timeout } = stages[stage];
    const payload = config.buildPayload(url, maxResults, fullDetails);
    const runUrl = `https://api.apify.com/v2/acts/${formattedActorId}/runs?token=${apifyApiKey}&memory=${memory}&timeout=${timeout}&webhooks=${encodeURIComponent(webhooksParam)}`;
    
    console.log(JSON.stringify({
      event: 'apify_start_attempt',
      requestId,
      stage: stage + 1,
      site,
      fullDetails,
      memory,
      timeout,
      url: url.toString()
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
          requestId,
          runId: responseData.data.id,
          datasetId: responseData.data.defaultDatasetId,
          stage: stage + 1
        }));
        
        return {
          runId: responseData.data.id,
          datasetId: responseData.data.defaultDatasetId
        };
      }
      
      // Stage 1 failed with quota/memory/rate error → try Stage 2
      const status = response.status;
      if ((status === 402 || status === 429) && stage === 0) {
        console.log(JSON.stringify({
          event: 'apify_stage1_failed_retrying',
          requestId,
          status,
          nextStage: 'basic_mode'
        }));
        continue;
      }
      
      // No more retries available
      console.error(JSON.stringify({
        event: 'apify_start_failed',
        requestId,
        status,
        stage: stage + 1,
        response: responseData
      }));
      
      return {
        ok: false,
        error: 'apify_start_failed',
        requestId,
        site,
        url: url.toString(),
        details: {
          status,
          message: responseData.error?.message || 'Failed to start Apify run',
          response: responseData
        }
      };
      
    } catch (error) {
      console.error(JSON.stringify({
        event: 'apify_start_exception',
        requestId,
        stage: stage + 1,
        error: error instanceof Error ? error.message : String(error)
      }));
      
      if (stage === 1) {
        return {
          ok: false,
          error: 'apify_start_failed',
          requestId,
          site,
          url: url.toString(),
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
    requestId,
    site,
    url: url.toString(),
    details: { message: 'All stages exhausted' }
  };
}

// Poll for dataset with timeout
async function pollForDataset(
  runId: string,
  apifyApiKey: string,
  maxSeconds: number = 600
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
    
    // Validate items before returning
    const { valid, invalid } = validateProperties(items);
    
    console.log(JSON.stringify({
      event: 'dataset_fetched_and_validated',
      totalItems: items.length,
      validItems: valid.length,
      invalidItems: invalid.length
    }));
    
    // Return only valid items
    return valid;
    
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
    // SECURITY: Require authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return errorResponse('Authentication required', 401);
    }

    // Validate user session
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse('Invalid authentication token', 401);
    }

    // SECURITY: Validate user has premium tier for ingestion
    const { data: entitlement } = await supabase
      .from('user_entitlements')
      .select('plan, expires_at')
      .eq('user_id', user.id)
      .single();

    if (!entitlement || entitlement.plan === 'free') {
      return errorResponse('Premium subscription required for property ingestion', 403);
    }

    if (entitlement.expires_at && new Date(entitlement.expires_at) < new Date()) {
      return errorResponse('Subscription expired', 403);
    }

    // Rate limiting check
    const ip = getClientIp(req);
    const rateLimitKey = getRateLimitKey(user.id, ip);
    const rateLimit = await checkRateLimit(rateLimitKey);
    
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return new Response(JSON.stringify({
        ok: false,
        error: 'rate_limit_exceeded',
        details: {
          message: 'Too many requests. Please try again later.',
          retryAfter,
          resetAt: new Date(rateLimit.resetAt).toISOString()
        }
      }), {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
          'Retry-After': String(retryAfter)
        }
      });
    }
    
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
    
    const body = await parseJsonBody<IngestRequest>(req);
    
    // Validate URL
    if (!body || !body.url) {
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
    const requestId = crypto.randomUUID();
    
    console.log(JSON.stringify({
      event: 'ingest_start',
      requestId,
      site,
      url: normalizedUrl.toString(),
      maxResults
    }));
    
    // Start Apify run with Stage 1/Stage 2 retry
    const startResult = await startApifyRun(site, normalizedUrl, maxResults, apifyApiKey, supabaseUrl, requestId);
    if ('error' in startResult) {
      return new Response(JSON.stringify(startResult), {
        status: startResult.details.status === 402 ? 402 : startResult.details.status === 429 ? 429 : 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const { runId, datasetId: initialDatasetId } = startResult;
    
    // Poll for completion and fetch items (up to 10 for preview)
    let items: any[] = [];
    let datasetId = initialDatasetId;
    
    if (initialDatasetId) {
      // We have a dataset ID, try to fetch items immediately
      const itemsResult = await fetchDatasetItems(initialDatasetId, apifyApiKey);
      if (!('error' in itemsResult)) {
        items = itemsResult.slice(0, 10); // Return first 10 as preview
      }
    } else {
      // Poll for dataset to be created
      const pollResult = await pollForDataset(runId, apifyApiKey, 120);
      if (!('error' in pollResult)) {
        datasetId = pollResult.datasetId;
        const itemsResult = await fetchDatasetItems(pollResult.datasetId, apifyApiKey);
        if (!('error' in itemsResult)) {
          items = itemsResult.slice(0, 10);
        }
      }
    }
    
    // Fire importer in background so full dataset is processed
    try {
      fetch(`${supabaseUrl}/functions/v1/apify-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ runId, datasetId, source: site, location: null, userId: body.userId })
      }).catch(() => {});
    } catch (_) {}
    
    // Return success with diagnostics
    const success: IngestSuccess = {
      ok: true,
      site,
      url: normalizedUrl.toString(),
      requestId,
      runId,
      datasetId: datasetId || '',
      items,
      itemCount: items.length
    };
    
    console.log(JSON.stringify({
      event: 'ingest_complete',
      requestId,
      site,
      runId,
      datasetId,
      itemCount: items.length
    }));
    
    return new Response(JSON.stringify(success), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const requestId = crypto.randomUUID();
    console.error(JSON.stringify({
      event: 'ingest_exception',
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }));
    
    const errorResponse: IngestError = {
      ok: false,
      error: 'server_error',
      requestId,
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
