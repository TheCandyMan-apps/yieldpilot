import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logger, generateRequestId } from "../_shared/log.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = generateRequestId();
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const apifyToken = Deno.env.get('APIFY_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify user has premium access
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check entitlements using database function (considers plan and expiry)
    const { data: hasAccess, error: entitlementError } = await supabase
      .rpc('has_entitlement', { _user_id: user.id, _feature: 'offmarket' });

    if (entitlementError) {
      logger.error('Entitlement check failed', { error: String(entitlementError) }, requestId);
      return new Response(JSON.stringify({ error: 'Entitlement check failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let access = !!hasAccess;
    if (!access) {
      // Fallback: direct entitlement check in case RPC logic is out of sync
      const { data: entitlement, error: entErr } = await supabase
        .from('user_entitlements')
        .select('features, expires_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!entErr && entitlement) {
        const active = !entitlement.expires_at || new Date(entitlement.expires_at) > new Date();
        const features = entitlement.features as Record<string, boolean>;
        access = active && !!features?.offmarket;
      } else if (entErr) {
        logger.warn('Fallback entitlement check failed', { error: String(entErr) }, requestId);
      }
    }

    if (!access) {
      return new Response(JSON.stringify({ error: 'Premium subscription required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { region = 'UK', postcode, minScore = 50 } = await req.json();

    // Query existing off-market leads
    let query = supabase
      .from('offmarket_leads')
      .select('*')
      .eq('status', 'active')
      .gte('lead_score', minScore)
      .gt('expires_at', new Date().toISOString())
      .order('lead_score', { ascending: false });

    if (postcode) {
      query = query.eq('postcode', postcode);
    } else {
      query = query.eq('region', region);
    }

    const { data: leads } = await query.limit(50);

    // Trigger background discovery if we have few results
    if (leads && leads.length < 10) {
      logger.info('Triggering background off-market discovery', { region, postcode }, requestId);
      
      // Trigger background ingestion (fire and forget)
      fetch(`${supabaseUrl}/functions/v1/ingest-offmarket`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          region,
          postcode,
          sources: ['withdrawn', 'auctions', 'planning', 'hmo']
        })
      }).catch(error => {
        logger.error('Background discovery trigger failed', { error: String(error) }, requestId);
      });
    }

    logger.info('Returned off-market leads', { count: leads?.length || 0, region }, requestId);

    return new Response(JSON.stringify({
      leads: leads || [],
      total: leads?.length || 0,
      premium: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Off-market error', { error: errorMessage }, requestId);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});