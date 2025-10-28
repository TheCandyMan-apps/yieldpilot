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

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (!profile || !['pro', 'investor_plus', 'enterprise'].includes(profile.subscription_tier)) {
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
    if (leads && leads.length < 10 && apifyToken) {
      // This would trigger various scrapers for:
      // - Auction sites (rightmove auctions, etc)
      // - Planning portals
      // - HMO registers
      // - Recently withdrawn listings
      
      logger.info('Triggering background off-market discovery', { region, postcode }, requestId);
      
      // Example: mock discovery (in production, this would call specialized Apify actors)
      // For now, we'll just log the intent
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