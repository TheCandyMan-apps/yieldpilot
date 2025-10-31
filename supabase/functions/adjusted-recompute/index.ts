/**
 * Adjusted Metrics Recompute
 * 
 * Refreshes regulation-adjusted ROI metrics for listings.
 * Can process single listing or batch of recent changes.
 * 
 * POST /functions/v1/adjusted-recompute
 * Body: { listing_id?: string, batch_size?: number }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecomputeRequest {
  listing_id?: string;
  batch_size?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'ERR_AUTH_REQUIRED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'ERR_AUTH_INVALID' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RecomputeRequest = await req.json().catch(() => ({}));
    const { listing_id, batch_size = 100 } = body;

    const startTime = Date.now();
    let processedCount = 0;

    if (listing_id) {
      // Recompute single listing
      console.log(`Recomputing adjusted metrics for listing: ${listing_id}`);
      
      // The view v_adjusted_metrics is live, so just touching it triggers recalc
      const { data, error } = await supabase
        .from('v_adjusted_metrics')
        .select('listing_id, adjusted_net_yield_pct, score_adjusted')
        .eq('listing_id', listing_id)
        .single();

      if (error) throw error;
      processedCount = 1;
      
      console.log(`Recomputed ${listing_id}: adjusted_yield=${data.adjusted_net_yield_pct}%`);
    } else {
      // Batch recompute recent changes
      console.log(`Recomputing batch of ${batch_size} listings`);
      
      const { data, error } = await supabase
        .from('v_adjusted_metrics')
        .select('listing_id, adjusted_net_yield_pct, score_adjusted')
        .order('calculated_at', { ascending: false })
        .limit(batch_size);

      if (error) throw error;
      processedCount = data?.length || 0;
      
      console.log(`Recomputed ${processedCount} listings in batch`);
    }

    const duration = Date.now() - startTime;

    // Log to audit
    await supabase.from('api_audit_logs').insert({
      user_id: user.id,
      route: '/adjusted-recompute',
      params_hash: JSON.stringify({ listing_id, batch_size }),
      duration_ms: duration,
      status_code: 200,
    });

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        duration_ms: duration,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in adjusted-recompute:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        error: 'ERR_RECOMPUTE_FAILED',
        details: Deno.env.get('DENO_ENV') === 'development' ? errorMsg : undefined
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
