import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Regional defaults for operating expenses
const REGIONAL_DEFAULTS: Record<string, { operating_exp_pct: number; vacancy_pct: number }> = {
  GB: { operating_exp_pct: 25, vacancy_pct: 5 },
  US: { operating_exp_pct: 30, vacancy_pct: 8 },
  ES: { operating_exp_pct: 20, vacancy_pct: 6 },
  default: { operating_exp_pct: 25, vacancy_pct: 7 },
};

function getRegionalDefaults(country: string) {
  return REGIONAL_DEFAULTS[country] || REGIONAL_DEFAULTS.default;
}

function calculateScore(metrics: {
  gross_yield_pct: number;
  net_yield_pct: number;
  price_per_sqm: number;
  days_on_market: number;
}): { score_numeric: number; score_band: string; explain_json: any } {
  let score = 0;
  const weights = {
    gross_yield: 35,
    net_yield: 30,
    price_efficiency: 20,
    days_on_market: 15,
  };

  const factors: any = {};

  // Gross yield (35 points)
  if (metrics.gross_yield_pct >= 8) {
    score += weights.gross_yield;
    factors.gross_yield = 'excellent';
  } else if (metrics.gross_yield_pct >= 6) {
    score += weights.gross_yield * 0.7;
    factors.gross_yield = 'good';
  } else if (metrics.gross_yield_pct >= 4) {
    score += weights.gross_yield * 0.4;
    factors.gross_yield = 'fair';
  } else {
    factors.gross_yield = 'poor';
  }

  // Net yield (30 points)
  if (metrics.net_yield_pct >= 6) {
    score += weights.net_yield;
    factors.net_yield = 'excellent';
  } else if (metrics.net_yield_pct >= 4) {
    score += weights.net_yield * 0.7;
    factors.net_yield = 'good';
  } else if (metrics.net_yield_pct >= 2) {
    score += weights.net_yield * 0.4;
    factors.net_yield = 'fair';
  } else {
    factors.net_yield = 'poor';
  }

  // Price efficiency (20 points)
  if (metrics.price_per_sqm > 0 && metrics.price_per_sqm < 3000) {
    score += weights.price_efficiency;
    factors.price_efficiency = 'excellent';
  } else if (metrics.price_per_sqm < 5000) {
    score += weights.price_efficiency * 0.6;
    factors.price_efficiency = 'good';
  } else {
    factors.price_efficiency = 'fair';
  }

  // Days on market (15 points)
  if (metrics.days_on_market <= 7) {
    score += weights.days_on_market;
    factors.days_on_market = 'hot';
  } else if (metrics.days_on_market <= 30) {
    score += weights.days_on_market * 0.7;
    factors.days_on_market = 'normal';
  } else {
    factors.days_on_market = 'stale';
  }

  // Determine band
  let band = 'E';
  if (score >= 80) band = 'A';
  else if (score >= 65) band = 'B';
  else if (score >= 50) band = 'C';
  else if (score >= 35) band = 'D';

  return {
    score_numeric: Math.round(score),
    score_band: band,
    explain_json: { weights, factors },
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { listing_id } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`[score] Processing listing: ${listing_id || 'ALL'}`);

    // Fetch listings to score
    let query = supabase.from('listings').select('*').eq('is_active', true);
    if (listing_id) {
      query = query.eq('id', listing_id);
    }

    const { data: listings, error } = await query;

    if (error) throw error;
    if (!listings || listings.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No listings to score' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processedCount = 0;

    for (const listing of listings) {
      try {
        const defaults = getRegionalDefaults(listing.country);

        // Estimate rent (mock - in production use ML model or regional averages)
        const estimated_rent = listing.price * 0.004; // 0.4% monthly yield assumption

        const gross_rent_month = estimated_rent;
        const annual_rent = gross_rent_month * 12;
        const gross_yield_pct = (annual_rent / listing.price) * 100;

        const operating_exp_pct = defaults.operating_exp_pct;
        const vacancy_pct = defaults.vacancy_pct;

        const net_rent = annual_rent * (1 - operating_exp_pct / 100) * (1 - vacancy_pct / 100);
        const net_yield_pct = (net_rent / listing.price) * 100;
        const cashflow_monthly = net_rent / 12;

        const price_per_sqm = listing.floor_area_m2 ? listing.price / listing.floor_area_m2 : 0;

        const scoreData = calculateScore({
          gross_yield_pct,
          net_yield_pct,
          price_per_sqm,
          days_on_market: listing.days_on_market || 0,
        });

        // Upsert metrics
        const { error: upsertError } = await supabase.from('listing_metrics').upsert(
          {
            listing_id: listing.id,
            gross_rent_month,
            operating_exp_pct,
            vacancy_pct,
            gross_yield_pct: Number(gross_yield_pct.toFixed(2)),
            net_yield_pct: Number(net_yield_pct.toFixed(2)),
            cashflow_monthly: Number(cashflow_monthly.toFixed(2)),
            score_numeric: scoreData.score_numeric,
            score_band: scoreData.score_band,
            explain_json: scoreData.explain_json,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'listing_id' }
        );

        if (upsertError) {
          console.error(`[score] Error upserting metrics for ${listing.id}:`, upsertError);
        } else {
          processedCount++;
        }
      } catch (err) {
        console.error(`[score] Exception processing listing ${listing.id}:`, err);
      }
    }

    console.log(`[score] Processed ${processedCount} listings`);

    return new Response(
      JSON.stringify({ success: true, processed: processedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[score] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
