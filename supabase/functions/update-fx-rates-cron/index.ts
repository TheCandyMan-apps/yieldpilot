import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[FX] Starting FX rates update...');

    // Using ExchangeRate-API (free tier, no key needed)
    const baseCurrencies = ['GBP', 'USD', 'EUR'];
    const updatedRates = [];

    for (const base of baseCurrencies) {
      try {
        const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${base}`);
        if (!response.ok) {
          console.warn(`[FX] Failed to fetch ${base} rates: ${response.statusText}`);
          continue;
        }

        const data = await response.json();
        const rates = data.rates;

        for (const target of baseCurrencies) {
          if (base === target) continue;

          const rate = rates[target];
          if (!rate) continue;

          const { error } = await supabaseClient
            .from('fx_rates')
            .upsert({
              base,
              target,
              rate,
              fetched_at: new Date().toISOString(),
            }, {
              onConflict: 'base,target',
            });

          if (!error) {
            updatedRates.push({ base, target, rate });
            console.log(`[FX] Updated: ${base} -> ${target} = ${rate}`);
          } else {
            console.error(`[FX] Error updating ${base}-${target}:`, error);
          }
        }
      } catch (error) {
        console.error(`[FX] Error fetching ${base} rates:`, error);
      }
    }

    // Now recalculate yields for all active listings using updated FX rates
    console.log('[FX] Triggering yield recalculation for active listings...');
    
    // Get all active listings
    const { data: listings, error: listingsError } = await supabaseClient
      .from('listings')
      .select('id')
      .eq('is_active', true)
      .limit(1000);

    if (listingsError) {
      console.error('[FX] Error fetching listings:', listingsError);
    } else {
      console.log(`[FX] Found ${listings?.length || 0} active listings to recalculate`);
      
      // Trigger calculation for each (in batches to avoid timeouts)
      const batchSize = 50;
      for (let i = 0; i < (listings?.length || 0); i += batchSize) {
        const batch = listings?.slice(i, i + batchSize) || [];
        
        await Promise.all(
          batch.map(listing =>
            supabaseClient.functions.invoke('calculate-deal', {
              body: { listingId: listing.id }
            }).catch(err => console.error(`[FX] Calc error for ${listing.id}:`, err))
          )
        );
        
        console.log(`[FX] Processed batch ${Math.floor(i / batchSize) + 1}`);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      updated: updatedRates.length,
      rates: updatedRates,
      listingsRecalculated: listings?.length || 0,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[FX] Fatal error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
