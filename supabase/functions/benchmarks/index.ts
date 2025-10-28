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

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { region, postcodePrefix, propertyType } = await req.json();

    if (!region) {
      return new Response(JSON.stringify({ error: 'region required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Query existing benchmarks
    let query = supabase
      .from('regional_benchmarks')
      .select('*')
      .eq('region', region)
      .order('data_date', { ascending: false });

    if (postcodePrefix) {
      query = query.eq('postcode_prefix', postcodePrefix);
    }

    if (propertyType) {
      query = query.eq('property_type', propertyType);
    }

    const { data: benchmarks } = await query.limit(1);

    if (benchmarks && benchmarks.length > 0) {
      logger.info('Returning cached benchmarks', { region, postcodePrefix }, requestId);
      return new Response(JSON.stringify(benchmarks[0]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Calculate fresh benchmarks from listings
    let listingsQuery = supabase
      .from('listings')
      .select(`
        *,
        listing_metrics (*)
      `)
      .eq('region', region)
      .eq('is_active', true);

    if (postcodePrefix) {
      listingsQuery = listingsQuery.ilike('postcode', `${postcodePrefix}%`);
    }

    if (propertyType) {
      listingsQuery = listingsQuery.eq('property_type', propertyType);
    }

    const { data: listings } = await listingsQuery;

    if (!listings || listings.length === 0) {
      return new Response(JSON.stringify({
        error: 'Insufficient data for benchmarks',
        sample_size: 0
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Calculate statistics
    const yields = listings
      .map(l => l.listing_metrics?.[0]?.net_yield_pct)
      .filter(y => y != null && y > 0);

    const prices = listings
      .map(l => l.price)
      .filter(p => p > 0);

    yields.sort((a, b) => a - b);
    prices.sort((a, b) => a - b);

    const avgYield = yields.reduce((a, b) => a + b, 0) / yields.length;
    const medianYield = yields[Math.floor(yields.length / 2)];
    const p10Yield = yields[Math.floor(yields.length * 0.1)];
    const p90Yield = yields[Math.floor(yields.length * 0.9)];
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

    const benchmark = {
      region,
      postcode_prefix: postcodePrefix || null,
      property_type: propertyType || null,
      data_date: new Date().toISOString().split('T')[0],
      sample_size: listings.length,
      avg_yield: avgYield,
      median_yield: medianYield,
      p10_yield: p10Yield,
      p90_yield: p90Yield,
      avg_price: avgPrice,
      currency: listings[0]?.currency || 'GBP',
      confidence_level: Math.min(0.95, listings.length / 100)
    };

    // Store benchmark
    await supabase
      .from('regional_benchmarks')
      .upsert(benchmark, {
        onConflict: 'region,postcode_prefix,property_type,data_date'
      });

    logger.info('Calculated fresh benchmarks', { region, sampleSize: listings.length }, requestId);

    return new Response(JSON.stringify(benchmark), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Benchmarks error', { error: errorMessage }, requestId);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});