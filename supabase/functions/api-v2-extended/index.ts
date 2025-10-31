import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { checkRateLimit, getRateLimitKey, getClientIp } from '../_shared/rate-limiter.ts';

// Helper for SHA-256 hashing
async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify API key
    const keyHash = await sha256(apiKey);
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('id, user_id, is_active, rate_limit_per_min')
      .eq('key_hash', keyHash)
      .single();

    if (keyError || !keyData || !keyData.is_active) {
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting
    const ip = getClientIp(req);
    const rateLimitKey = getRateLimitKey(keyData.user_id, ip);
    const { allowed, remaining, resetAt } = await checkRateLimit(rateLimitKey);

    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetAt.toString(),
          },
        }
      );
    }

    // Parse query params
    const url = new URL(req.url);
    const country = url.searchParams.get('country');
    const region = url.searchParams.get('region');
    const minYield = url.searchParams.get('min_yield');
    const maxYield = url.searchParams.get('max_yield');
    const minPrice = url.searchParams.get('min_price');
    const maxPrice = url.searchParams.get('max_price');
    const beds = url.searchParams.get('beds');
    const propertyType = url.searchParams.get('property_type');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

    // Build query
    let query = supabase
      .from('v_investor_deals')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (country) query = query.eq('country', country);
    if (region) query = query.eq('region', region);
    if (minYield) query = query.gte('net_yield_pct', parseFloat(minYield));
    if (maxYield) query = query.lte('net_yield_pct', parseFloat(maxYield));
    if (minPrice) query = query.gte('price', parseFloat(minPrice));
    if (maxPrice) query = query.lte('price', parseFloat(maxPrice));
    if (beds) query = query.eq('beds', parseInt(beds));
    if (propertyType) query = query.eq('property_type', propertyType);

    const { data: listings, error } = await query;

    if (error) throw error;

    // Log usage
    const duration = Date.now() - startTime;
    await supabase.from('api_usage').insert({
      api_key_id: keyData.id,
      user_id: keyData.user_id,
      endpoint: '/api-v2-extended',
      method: req.method,
      status_code: 200,
      response_time_ms: duration,
    });

    await supabase.from('metered_usage').insert({
      user_id: keyData.user_id,
      resource_type: 'api_call',
      quantity: 1,
      metadata: { endpoint: '/api-v2-extended', filters: { country, region, minYield } },
    });

    return new Response(
      JSON.stringify({ listings, count: listings?.length || 0 }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': resetAt.toString(),
        },
      }
    );
  } catch (error) {
    console.error('[api-v2-extended] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
