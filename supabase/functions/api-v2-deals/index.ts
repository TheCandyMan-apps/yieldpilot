import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = req.headers.get('x-api-key');
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify API key
    const { data: keyData, error: keyError } = await supabaseClient
      .from('api_keys')
      .select('user_id, is_active, scopes')
      .eq('key', apiKey)
      .single();

    if (keyError || !keyData || !keyData.is_active) {
      return new Response(JSON.stringify({ error: 'Invalid or inactive API key' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check scopes
    if (!keyData.scopes.includes('read:deals')) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update last_used_at
    await supabaseClient
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('key', apiKey);

    const url = new URL(req.url);
    const region = url.searchParams.get('region');
    const minYield = url.searchParams.get('minYield');
    const maxPrice = url.searchParams.get('maxPrice');
    const propertyType = url.searchParams.get('propertyType');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    // Build query
    let query = supabaseClient
      .from('listings')
      .select(`
        id,
        property_address,
        price,
        bedrooms,
        bathrooms,
        property_type,
        region,
        currency,
        city,
        postcode,
        listing_url,
        images,
        listing_metrics (
          gross_yield_pct,
          net_yield_pct,
          score,
          rank_score
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (region) {
      query = query.eq('region', region.toUpperCase());
    }

    if (propertyType) {
      query = query.eq('property_type', propertyType);
    }

    if (maxPrice) {
      query = query.lte('price', parseFloat(maxPrice));
    }

    const { data: deals, error: dealsError } = await query;

    if (dealsError) throw dealsError;

    // Filter by yield if specified
    let filteredDeals = deals;
    if (minYield) {
      const minYieldNum = parseFloat(minYield);
      filteredDeals = deals.filter(deal => {
        const metrics = Array.isArray(deal.listing_metrics) 
          ? deal.listing_metrics[0] 
          : deal.listing_metrics;
        return metrics && metrics.net_yield_pct >= minYieldNum;
      });
    }

    return new Response(JSON.stringify({
      success: true,
      count: filteredDeals.length,
      deals: filteredDeals,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('API v2 error:', error);
    const isDev = Deno.env.get('ENVIRONMENT') === 'development';
    const errorMessage = isDev && error?.message 
      ? error.message 
      : 'Internal server error processing request';
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      code: 'ERR_API_REQUEST_FAILED'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
