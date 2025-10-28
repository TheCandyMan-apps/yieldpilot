import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScenarioParameters {
  name: string;
  interest_rate_change_bps?: number;
  rent_change_pct?: number;
  void_rate_change_pct?: number;
  maintenance_change_pct?: number;
  property_value_change_pct?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { portfolioId, scenarios } = await req.json();

    // Get portfolio deals
    const { data: portfolioItems, error: itemsError } = await supabaseClient
      .from('portfolio_items')
      .select('listing_id')
      .eq('portfolio_id', portfolioId);

    if (itemsError) throw itemsError;

    const listingIds = portfolioItems.map(item => item.listing_id);

    // Get deals with metrics
    const { data: deals, error: dealsError } = await supabaseClient
      .from('listings')
      .select('*, listing_metrics(*)')
      .in('id', listingIds);

    if (dealsError) throw dealsError;

    // Run scenarios
    const results = scenarios.map((params: ScenarioParameters) => {
      return runScenario(deals, params);
    });

    // Save scenario runs
    const scenarioRuns = results.map((result: any, index: number) => ({
      user_id: user.id,
      portfolio_id: portfolioId,
      name: scenarios[index].name,
      parameters: scenarios[index],
      results: result,
    }));

    const { error: saveError } = await supabaseClient
      .from('scenario_runs')
      .insert(scenarioRuns);

    if (saveError) {
      console.error('Error saving scenario runs:', saveError);
    }

    return new Response(JSON.stringify({ scenarios: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Scenario runner error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function runScenario(deals: any[], params: ScenarioParameters) {
  const baseline = calculateMetrics(deals);
  const scenarioDeals = applyScenario(deals, params);
  const scenario = calculateMetrics(scenarioDeals);

  return {
    name: params.name,
    baseline,
    scenario,
    delta: {
      monthly_cashflow: scenario.monthly_cashflow - baseline.monthly_cashflow,
      annual_cashflow: scenario.annual_cashflow - baseline.annual_cashflow,
      portfolio_yield: scenario.portfolio_yield - baseline.portfolio_yield,
      avg_dscr: scenario.avg_dscr - baseline.avg_dscr,
    },
    risk_flags: getRiskFlags(scenario),
  };
}

function applyScenario(deals: any[], params: ScenarioParameters) {
  return deals.map(deal => {
    const kpis = deal.listing_metrics[0]?.kpis?.working;
    const assumptions = deal.listing_metrics[0]?.assumptions;
    if (!kpis || !assumptions) return deal;

    const newKpis = { ...kpis };

    // Apply interest rate change
    if (params.interest_rate_change_bps) {
      const newRate = (assumptions.apr || 5.5) + params.interest_rate_change_bps / 100;
      const loanAmount = deal.price * (1 - (assumptions.deposit_pct || 25) / 100);
      
      if (assumptions.interest_only) {
        newKpis.monthly_mortgage = (loanAmount * newRate / 100) / 12;
      } else {
        const monthlyRate = newRate / 100 / 12;
        const numPayments = (assumptions.term_years || 25) * 12;
        newKpis.monthly_mortgage = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
      }
    }

    // Apply rent change
    if (params.rent_change_pct) {
      newKpis.monthly_rental_income = (newKpis.monthly_rental_income || 0) * (1 + params.rent_change_pct / 100);
    }

    // Recalculate cashflow
    newKpis.net_monthly_cashflow = 
      (newKpis.monthly_rental_income || 0) -
      (newKpis.monthly_mortgage || 0) -
      (newKpis.monthly_operating_costs || 0);

    return {
      ...deal,
      listing_metrics: [{
        ...deal.listing_metrics[0],
        kpis: { working: newKpis },
      }],
    };
  });
}

function calculateMetrics(deals: any[]) {
  let total_value = 0;
  let total_equity = 0;
  let monthly_cashflow = 0;
  let total_dscr = 0;
  let dscr_count = 0;

  deals.forEach(deal => {
    const kpis = deal.listing_metrics[0]?.kpis?.working;
    const assumptions = deal.listing_metrics[0]?.assumptions;
    if (!kpis) return;

    const price = deal.price || 0;
    const deposit = (assumptions?.deposit_pct || 25) / 100;
    
    total_value += price;
    total_equity += price * deposit;
    monthly_cashflow += kpis.net_monthly_cashflow || 0;

    if (kpis.dscr) {
      total_dscr += kpis.dscr;
      dscr_count++;
    }
  });

  const annual_cashflow = monthly_cashflow * 12;
  const portfolio_yield = total_equity > 0 ? (annual_cashflow / total_equity) * 100 : 0;
  const avg_dscr = dscr_count > 0 ? total_dscr / dscr_count : 0;

  return {
    total_value,
    total_equity,
    monthly_cashflow,
    annual_cashflow,
    portfolio_yield,
    avg_dscr,
  };
}

function getRiskFlags(metrics: any): string[] {
  const flags = [];
  
  if (metrics.avg_dscr < 1.0) {
    flags.push('Portfolio average DSCR below 1.0 - refinancing risk');
  }
  
  if (metrics.monthly_cashflow < 0) {
    flags.push('Negative portfolio cashflow - liquidity risk');
  }
  
  if (metrics.portfolio_yield < 5) {
    flags.push('Portfolio yield below 5% - opportunity cost risk');
  }

  return flags;
}
