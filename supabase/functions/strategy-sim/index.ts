/**
 * Strategy Simulator
 * 
 * Simulates investment outcomes for different strategies (BRRR, HMO, LTR, STR).
 * Applies strategy-specific assumptions and computes 10-year projections.
 * 
 * POST /functions/v1/strategy-sim
 * Body: { listing_id: string, strategy_key: string, overrides?: object }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StrategySimRequest {
  listing_id: string;
  strategy_key: string; // 'BRRR', 'HMO', 'LTR', 'STR'
  overrides?: Record<string, any>;
}

interface StrategySimResponse {
  listing_id: string;
  strategy_key: string;
  strategy_label: string;
  assumptions: Record<string, any>;
  metrics: {
    initial_investment: number;
    monthly_cashflow: number;
    annual_cashflow: number;
    dscr: number;
    cash_on_cash_return_pct: number;
    irr_10yr_pct: number;
    equity_multiple: number;
    breakeven_occupancy_pct: number;
    refi_year?: number;
    exit_year: number;
  };
  projection_10yr: Array<{
    year: number;
    property_value: number;
    debt_balance: number;
    equity: number;
    annual_cashflow: number;
    cumulative_cashflow: number;
  }>;
}

function calculateDSCR(noi: number, debtService: number): number {
  if (debtService === 0) return 999;
  return noi / debtService;
}

function calculateIRR(cashflows: number[]): number {
  // Simple IRR approximation using Newton-Raphson
  // cashflows[0] = initial investment (negative)
  // cashflows[1..n] = annual returns
  
  if (cashflows.length < 2) return 0;
  
  let rate = 0.1; // Initial guess
  const maxIterations = 100;
  const tolerance = 0.0001;
  
  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let dnpv = 0;
    
    for (let j = 0; j < cashflows.length; j++) {
      npv += cashflows[j] / Math.pow(1 + rate, j);
      dnpv -= j * cashflows[j] / Math.pow(1 + rate, j + 1);
    }
    
    if (Math.abs(npv) < tolerance) break;
    if (dnpv === 0) break;
    
    rate = rate - npv / dnpv;
  }
  
  return rate * 100;
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

    const body: StrategySimRequest = await req.json();
    const { listing_id, strategy_key, overrides = {} } = body;

    if (!listing_id || !strategy_key) {
      return new Response(
        JSON.stringify({ error: 'ERR_MISSING_PARAMS' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch strategy preset
    const { data: strategy, error: strategyError } = await supabase
      .from('strategy_presets')
      .select('*')
      .eq('key', strategy_key)
      .single();

    if (strategyError || !strategy) {
      return new Response(
        JSON.stringify({ error: 'ERR_STRATEGY_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch listing and metrics
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select(`
        id, price, estimated_rent, bedrooms, property_type, country,
        listing_metrics (
          rent_monthly, ltv_pct, interest_rate_pct, operating_exp_pct, vacancy_pct
        )
      `)
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) {
      return new Response(
        JSON.stringify({ error: 'ERR_LISTING_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Merge strategy params with overrides
    const strategyParams = { ...strategy.params, ...overrides };
    const metrics = listing.listing_metrics?.[0] || {};

    // Financial calculations
    const price = listing.price;
    const ltv = strategyParams.ltv || metrics.ltv_pct || 75;
    const loanAmount = price * (ltv / 100);
    const depositAmount = price - loanAmount;
    const capexUpfront = strategyParams.capex_upfront || 0;
    const initialInvestment = depositAmount + capexUpfront;

    const baseRent = metrics.rent_monthly || listing.estimated_rent || price * 0.005;
    const rentUplift = strategyParams.rent_uplift_pct || 0;
    const adjustedRent = baseRent * (1 + rentUplift / 100);
    const annualRent = adjustedRent * 12;

    const interestRate = metrics.interest_rate_pct || 5.5;
    const annualInterest = loanAmount * (interestRate / 100);
    
    const opexPct = strategyParams.opex_pct || metrics.operating_exp_pct || 25;
    const vacancyPct = strategyParams.vacancy_pct || metrics.vacancy_pct || 6;
    const licensingMonthly = strategyParams.licensing_monthly || 0;

    const operatingExp = annualRent * (opexPct / 100);
    const vacancyCost = annualRent * (vacancyPct / 100);
    const licensingAnnual = licensingMonthly * 12;

    const noi = annualRent - operatingExp - vacancyCost - licensingAnnual;
    const annualCashflow = noi - annualInterest;
    const monthlyCashflow = annualCashflow / 12;

    const dscr = calculateDSCR(noi, annualInterest);
    const cashOnCashReturn = (annualCashflow / initialInvestment) * 100;
    const breakeven = ((operatingExp + vacancyCost + licensingAnnual + annualInterest) / annualRent) * 100;

    // 10-year projection
    const exitYear = strategyParams.exit_year || 10;
    const refiYear = strategyParams.refi_year;
    const appreciationRate = 0.03; // 3% annual
    const rentIncreaseYr = strategyParams.rent_increase_yr || 2.5;

    const projection = [];
    let cumulativeCashflow = -initialInvestment;
    let currentValue = price;
    let currentDebt = loanAmount;
    const cashflowsForIRR = [-initialInvestment];

    for (let year = 1; year <= 10; year++) {
      currentValue = currentValue * (1 + appreciationRate);
      
      // Refinance logic
      if (refiYear && year === refiYear) {
        const refiLTV = strategyParams.refi_ltv || ltv;
        const newLoan = currentValue * (refiLTV / 100);
        const cashOut = newLoan - currentDebt;
        currentDebt = newLoan;
        cumulativeCashflow += cashOut;
      }

      const yearRent = annualRent * Math.pow(1 + rentIncreaseYr / 100, year - 1);
      const yearOpex = yearRent * (opexPct / 100);
      const yearVacancy = yearRent * (vacancyPct / 100);
      const yearNOI = yearRent - yearOpex - yearVacancy - licensingAnnual;
      const yearInterest = currentDebt * (interestRate / 100);
      const yearCashflow = yearNOI - yearInterest;

      cumulativeCashflow += yearCashflow;
      cashflowsForIRR.push(yearCashflow);

      // Exit in final year
      if (year === exitYear) {
        const equity = currentValue - currentDebt;
        cashflowsForIRR[year] += equity;
      }

      projection.push({
        year,
        property_value: Math.round(currentValue),
        debt_balance: Math.round(currentDebt),
        equity: Math.round(currentValue - currentDebt),
        annual_cashflow: Math.round(yearCashflow),
        cumulative_cashflow: Math.round(cumulativeCashflow),
      });
    }

    const irr = calculateIRR(cashflowsForIRR);
    const finalEquity = projection[exitYear - 1]?.equity || 0;
    const equityMultiple = finalEquity / initialInvestment;

    const response: StrategySimResponse = {
      listing_id,
      strategy_key,
      strategy_label: strategy.label,
      assumptions: {
        price,
        ltv,
        deposit: depositAmount,
        capex_upfront: capexUpfront,
        rent_monthly_adjusted: adjustedRent,
        rent_uplift_pct: rentUplift,
        interest_rate: interestRate,
        opex_pct: opexPct,
        vacancy_pct: vacancyPct,
        licensing_monthly: licensingMonthly,
        exit_year: exitYear,
        refi_year: refiYear,
      },
      metrics: {
        initial_investment: Math.round(initialInvestment),
        monthly_cashflow: Math.round(monthlyCashflow),
        annual_cashflow: Math.round(annualCashflow),
        dscr: Math.round(dscr * 100) / 100,
        cash_on_cash_return_pct: Math.round(cashOnCashReturn * 100) / 100,
        irr_10yr_pct: Math.round(irr * 100) / 100,
        equity_multiple: Math.round(equityMultiple * 100) / 100,
        breakeven_occupancy_pct: Math.round(breakeven * 100) / 100,
        refi_year: refiYear,
        exit_year: exitYear,
      },
      projection_10yr: projection,
    };

    console.log(`Strategy sim ${strategy_key} for ${listing_id}: IRR=${irr.toFixed(1)}%, DSCR=${dscr.toFixed(2)}`);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in strategy-sim:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        error: 'ERR_SIMULATION_FAILED',
        details: Deno.env.get('DENO_ENV') === 'development' ? errorMsg : undefined
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
