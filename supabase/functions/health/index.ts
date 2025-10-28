import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check environment variables
    const envCheck = {
      apifyToken: !!Deno.env.get('APIFY_API_KEY'),
      openaiKey: !!Deno.env.get('OPENAI_API_KEY'),
      supabaseConnected: true,
    };

    // Check Supabase connectivity
    let dbConnected = false;
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      dbConnected = !error;
    } catch {
      dbConnected = false;
    }

    // Get recent error counts by provider
    const { data: recentErrors } = await supabase
      .from('ingest_events')
      .select('provider, status')
      .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
      .eq('status', 'failed');

    const errorsByProvider: Record<string, number> = {};
    if (recentErrors) {
      for (const event of recentErrors) {
        errorsByProvider[event.provider] = (errorsByProvider[event.provider] || 0) + 1;
      }
    }

    // Get last FX refresh time
    const { data: lastFxRate } = await supabase
      .from('fx_rates')
      .select('fetched_at')
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single();

    const lastFxRefresh = lastFxRate?.fetched_at || null;
    const fxStale = lastFxRefresh 
      ? Date.now() - new Date(lastFxRefresh).getTime() > 86400000 // >24h
      : true;

    const health = {
      status: dbConnected ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbConnected,
        environment: envCheck,
        fx: {
          lastRefresh: lastFxRefresh,
          stale: fxStale,
        },
        ingestion: {
          errorsByProvider,
          recentErrorCount: Object.values(errorsByProvider).reduce((a, b) => a + b, 0),
        },
      },
    };

    return new Response(JSON.stringify(health), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Health check error:', error);
    return new Response(JSON.stringify({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
