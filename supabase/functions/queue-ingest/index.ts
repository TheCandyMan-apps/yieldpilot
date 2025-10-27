import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QueueRequest {
  url: string;
}

// Normalize URL for Zoopla/Rightmove
function normalizeUrl(rawUrl: string): URL | null {
  try {
    let url = rawUrl.trim();
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

// Detect site from URL
function siteFor(url: URL): 'zoopla' | 'rightmove' | null {
  const hostname = url.hostname.toLowerCase();
  if (hostname.includes('zoopla.co.uk')) return 'zoopla';
  if (hostname.includes('rightmove.co.uk')) return 'rightmove';
  return null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { url }: QueueRequest = await req.json();

    // Validate and normalize URL
    const normalized = normalizeUrl(url);
    if (!normalized) {
      return new Response(
        JSON.stringify({ error: 'invalid_url', message: 'Invalid URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const site = siteFor(normalized);
    if (!site) {
      return new Response(
        JSON.stringify({ error: 'unsupported_site', message: 'Only Zoopla and Rightmove URLs are supported' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedUrl = normalized.toString();

    // Check for existing active job
    const { data: existingJob } = await supabase
      .from('ingest_jobs')
      .select('*')
      .eq('normalized_url', normalizedUrl)
      .in('status', ['queued', 'running'])
      .single();

    if (existingJob) {
      console.log('⟳ Returning existing active job:', existingJob.id);
      return new Response(
        JSON.stringify({
          ok: true,
          jobId: existingJob.id,
          status: existingJob.status,
          site: existingJob.site,
          existing: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user ID if authenticated
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      userId = user?.id || null;
    }

    // Create new job
    const { data: newJob, error: insertError } = await supabase
      .from('ingest_jobs')
      .insert({
        site,
        input_url: url,
        normalized_url: normalizedUrl,
        status: 'queued',
        created_by: userId,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create job:', insertError);
      return new Response(
        JSON.stringify({ error: 'db_error', message: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✓ Created job:', newJob.id, 'for', site, normalizedUrl);

    return new Response(
      JSON.stringify({
        ok: true,
        jobId: newJob.id,
        status: 'queued',
        site,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('queue-ingest error:', error);
    return new Response(
      JSON.stringify({ error: 'internal_error', message: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
