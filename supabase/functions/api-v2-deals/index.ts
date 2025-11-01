import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { ApiQueryParamsSchema, createErrorResponse } from "../_shared/api-validation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

// SHA-256 hash function
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

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

    // Hash the API key for comparison
    const hashedKey = await sha256(apiKey);

    // Verify API key using hash
    const { data: keyData, error: keyError } = await supabaseClient
      .from('api_keys')
      .select('user_id, is_active, scopes')
      .eq('key_hash', hashedKey)
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
      .eq('key_hash', hashedKey);

    const url = new URL(req.url);
    
    // Validate query parameters
    const paramValidation = ApiQueryParamsSchema.safeParse({
      region: url.searchParams.get('region'),
      minYield: url.searchParams.get('minYield'),
      maxPrice: url.searchParams.get('maxPrice'),
      propertyType: url.searchParams.get('propertyType'),
      limit: url.searchParams.get('limit') || '50',
    });

    if (!paramValidation.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid parameters', 
          details: paramValidation.error.errors,
          code: 'ERR_INVALID_PARAMS'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { region, minYield, maxPrice, propertyType, limit = 50 } = paramValidation.data;

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
      query = query.lte('price', maxPrice);
    }

    const { data: deals, error: dealsError } = await query;

    if (dealsError) throw dealsError;

    // Filter by yield if specified
    let filteredDeals = deals;
    if (minYield) {
      filteredDeals = deals.filter(deal => {
        const metrics = Array.isArray(deal.listing_metrics) 
          ? deal.listing_metrics[0] 
          : deal.listing_metrics;
        return metrics && metrics.net_yield_pct >= minYield;
      });
    }

    return new Response(JSON.stringify({
      success: true,
      count: filteredDeals.length,
      deals: filteredDeals,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return createErrorResponse(error, 500, corsHeaders);
  }
});
