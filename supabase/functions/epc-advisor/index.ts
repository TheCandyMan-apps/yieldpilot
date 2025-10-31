/**
 * EPC Retrofit Advisor
 * 
 * Provides property-specific EPC upgrade recommendations and cost estimates.
 * Uses epc_upgrade_costs table to estimate retrofit packages.
 * 
 * POST /functions/v1/epc-advisor
 * Body: { listing_id: string, target?: string }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EPCAdvisorRequest {
  listing_id: string;
  target?: string; // Default 'C'
}

interface EPCAdvisorResponse {
  listing_id: string;
  current_epc: string;
  target_epc: string;
  epc_gap: number;
  recommended_measures: string[];
  cost_estimate_min: number;
  cost_estimate_max: number;
  cost_estimate_median: number;
  amort_years: number;
  monthly_cost: number;
  expected_yield_uplift_pct: number;
  payback_years: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

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

    const body: EPCAdvisorRequest = await req.json();
    const { listing_id, target = 'C' } = body;

    if (!listing_id) {
      return new Response(
        JSON.stringify({ error: 'ERR_MISSING_LISTING_ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch listing details
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, country, property_type, epc_rating, price, estimated_rent')
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) {
      return new Response(
        JSON.stringify({ error: 'ERR_LISTING_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentEPC = listing.epc_rating || 'D';
    const epcOrder = ['G', 'F', 'E', 'D', 'C', 'B', 'A'];
    const epcGap = epcOrder.indexOf(target) - epcOrder.indexOf(currentEPC);

    if (epcGap <= 0) {
      return new Response(
        JSON.stringify({
          listing_id,
          current_epc: currentEPC,
          target_epc: target,
          epc_gap: 0,
          message: 'Property already meets or exceeds target EPC rating',
          recommended_measures: [],
          cost_estimate_min: 0,
          cost_estimate_max: 0,
          cost_estimate_median: 0,
          amort_years: 0,
          monthly_cost: 0,
          expected_yield_uplift_pct: 0,
          payback_years: 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch retrofit costs
    const { data: costData, error: costError } = await supabase
      .from('epc_upgrade_costs')
      .select('*')
      .eq('country', listing.country || 'UK')
      .eq('current_epc', currentEPC)
      .eq('target_epc', target)
      .order('property_type')
      .limit(1);

    if (costError || !costData || costData.length === 0) {
      // Fallback estimates
      const fallbackMin = epcGap * 3000;
      const fallbackMax = epcGap * 6000;
      const median = (fallbackMin + fallbackMax) / 2;
      
      return new Response(
        JSON.stringify({
          listing_id,
          current_epc: currentEPC,
          target_epc: target,
          epc_gap: epcGap,
          recommended_measures: [
            'Insulation (loft/wall/floor)',
            'Double/Triple glazing',
            'Energy-efficient boiler',
            'LED lighting',
          ],
          cost_estimate_min: fallbackMin,
          cost_estimate_max: fallbackMax,
          cost_estimate_median: median,
          amort_years: 7,
          monthly_cost: Math.round(median / 7 / 12),
          expected_yield_uplift_pct: 0.3,
          payback_years: Math.round(median / (listing.price * 0.003)),
          note: 'Using fallback estimates - no specific data for this property type',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const costs = costData[0];
    const median = (costs.est_cost_min + costs.est_cost_max) / 2;
    const amortYears = 7;
    const monthlyCost = Math.round(median / amortYears / 12);

    // Estimate yield uplift (typical 0.2-0.5% for each EPC band improvement)
    const yieldUplift = epcGap * 0.3;
    const annualRent = (listing.estimated_rent || listing.price * 0.005) * 12;
    const paybackYears = Math.round(median / (annualRent * (yieldUplift / 100)));

    const response: EPCAdvisorResponse = {
      listing_id,
      current_epc: currentEPC,
      target_epc: target,
      epc_gap: epcGap,
      recommended_measures: [
        'Loft insulation (270mm+)',
        'Cavity wall insulation',
        'Double glazing upgrade',
        'Condensing boiler replacement',
        'LED lighting throughout',
        'Smart heating controls',
      ].slice(0, epcGap + 2),
      cost_estimate_min: costs.est_cost_min,
      cost_estimate_max: costs.est_cost_max,
      cost_estimate_median: median,
      amort_years: amortYears,
      monthly_cost: monthlyCost,
      expected_yield_uplift_pct: yieldUplift,
      payback_years: paybackYears,
    };

    // Log advice
    await supabase.from('advice_audit').insert({
      user_id: user.id,
      listing_id,
      advice_type: 'epc_retrofit',
      request: { target },
      response,
    });

    console.log(`EPC advice for ${listing_id}: ${currentEPC}→${target}, cost £${median.toLocaleString()}`);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in epc-advisor:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        error: 'ERR_ADVISOR_FAILED',
        details: Deno.env.get('DENO_ENV') === 'development' ? errorMsg : undefined
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
