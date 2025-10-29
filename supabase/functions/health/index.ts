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

    // Provider health checks
    const providers = [
      { id: 'zoopla-uk', region: 'UK' }, { id: 'rightmove-uk', region: 'UK' },
      { id: 'realtor-us', region: 'US' }, { id: 'zillow-us', region: 'US' }, { id: 'redfin-us', region: 'US' },
      { id: 'immobilienscout-de', region: 'DE' }, { id: 'seloger-fr', region: 'FR' }, { id: 'idealista-es', region: 'ES' },
    ];

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const providerHealth = await Promise.all(
      providers.map(async (p) => {
        const { data: jobs } = await supabase
          .from('ingest_jobs')
          .select('status')
          .eq('site', p.id)
          .gte('created_at', yesterday);

        const total = jobs?.length || 0;
        const succeeded = jobs?.filter(j => j.status === 'succeeded').length || 0;
        const successRate = total > 0 ? Math.round((succeeded / total) * 100) : 0;

        return {
          id: p.id,
          region: p.region,
          status: successRate >= 80 ? 'ok' : successRate >= 50 ? 'degraded' : 'down',
          jobsLast24h: total,
          successRate,
        };
      })
    );

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

    const avgSuccessRate = providerHealth.reduce((sum, p) => sum + p.successRate, 0) / providerHealth.length;

    const health = {
      status: dbConnected && avgSuccessRate >= 70 ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbConnected,
        environment: envCheck,
        fx: {
          lastRefresh: lastFxRefresh,
          stale: fxStale,
        },
        providers: providerHealth,
        summary: {
          avgSuccessRate: Math.round(avgSuccessRate),
          totalJobs24h: providerHealth.reduce((sum, p) => sum + p.jobsLast24h, 0),
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
