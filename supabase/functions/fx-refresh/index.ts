import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mock FX provider - replace with real API (e.g., exchangerate-api.com, fixer.io)
async function fetchFxRates(): Promise<{ base: string; quote: string; rate: number }[]> {
  // In production, call external FX API using Deno.env.get('FX_API_KEY')
  const mockRates = [
    { base: 'USD', quote: 'USD', rate: 1.0 },
    { base: 'USD', quote: 'EUR', rate: 0.92 },
    { base: 'USD', quote: 'GBP', rate: 0.79 },
    { base: 'EUR', quote: 'USD', rate: 1.09 },
    { base: 'EUR', quote: 'EUR', rate: 1.0 },
    { base: 'EUR', quote: 'GBP', rate: 0.86 },
    { base: 'GBP', quote: 'USD', rate: 1.27 },
    { base: 'GBP', quote: 'EUR', rate: 1.16 },
    { base: 'GBP', quote: 'GBP', rate: 1.0 },
  ];

  return mockRates;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[fx-refresh] Fetching FX rates...');
    const rates = await fetchFxRates();

    // Insert new rates
    const { error: insertError } = await supabase.from('fx_rates').insert(
      rates.map((r) => ({
        base: r.base,
        quote: r.quote,
        rate: r.rate,
        fetched_at: new Date().toISOString(),
      }))
    );

    if (insertError) {
      throw insertError;
    }

    // Prune old rates (keep last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { error: deleteError } = await supabase
      .from('fx_rates')
      .delete()
      .lt('fetched_at', thirtyDaysAgo.toISOString());

    if (deleteError) {
      console.error('[fx-refresh] Error pruning old rates:', deleteError);
    }

    console.log(`[fx-refresh] Updated ${rates.length} FX rates`);

    return new Response(
      JSON.stringify({ success: true, count: rates.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[fx-refresh] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
