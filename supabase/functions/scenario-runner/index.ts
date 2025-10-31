import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScenarioParams {
  interestRateChange: number;
  rentChange: number;
  propertyValueChange: number;
  voidRateChange: number;
  maintenanceChange: number;
}

interface Deal {
  id: string;
  price: number;
  estimated_rent: number;
  yield_percentage: number;
  roi_percentage: number;
  cash_flow_monthly: number;
}

function applyScenarioToDeal(deal: Deal, params: ScenarioParams): Deal {
  const newRent = deal.estimated_rent * (1 + params.rentChange / 100);
  const newPrice = deal.price * (1 + params.propertyValueChange / 100);
  const newYield = (newRent * 12 / newPrice) * 100;
  
  const mortgageAmount = newPrice * 0.75;
  const oldInterestRate = 5.5;
  const newInterestRate = oldInterestRate + params.interestRateChange;
  const monthlyMortgage = (mortgageAmount * newInterestRate / 100) / 12;
  
  const baseOpex = newRent * 0.25;
  const adjustedOpex = baseOpex * (1 + params.maintenanceChange / 100);
  const voidAdjustment = newRent * (params.voidRateChange / 100);
  
  const newCashFlow = newRent - monthlyMortgage - adjustedOpex - voidAdjustment;
  const equity = newPrice * 0.25;
  const annualCashFlow = newCashFlow * 12;
  const newROI = (annualCashFlow / equity) * 100;

  return {
    ...deal,
    price: newPrice,
    estimated_rent: newRent,
    yield_percentage: newYield,
    roi_percentage: newROI,
    cash_flow_monthly: newCashFlow,
  };
}

function calculatePortfolioMetrics(deals: Deal[]) {
  const totalValue = deals.reduce((sum, d) => sum + d.price, 0);
  const totalRent = deals.reduce((sum, d) => sum + (d.estimated_rent || 0) * 12, 0);
  const totalCashFlow = deals.reduce((sum, d) => sum + (d.cash_flow_monthly || 0) * 12, 0);
  const avgYield = deals.reduce((sum, d) => sum + (d.yield_percentage || 0), 0) / deals.length;
  const avgROI = deals.reduce((sum, d) => sum + (d.roi_percentage || 0), 0) / deals.length;
  
  return {
    totalValue,
    totalRent,
    totalCashFlow,
    avgYield,
    avgROI,
    dealCount: deals.length,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { portfolio_id, scenarios } = await req.json();

    const { data: portfolioItems, error: itemsError } = await supabase
      .from('portfolio_items')
      .select('listing_id')
      .eq('portfolio_id', portfolio_id);

    if (itemsError) throw itemsError;

    const listingIds = portfolioItems.map(item => item.listing_id);
    
    const { data: deals, error: dealsError } = await supabase
      .from('listings')
      .select('id, price, estimated_rent, yield_percentage, roi_percentage, cash_flow_monthly')
      .in('id', listingIds);

    if (dealsError) throw dealsError;

    const baselineMetrics = calculatePortfolioMetrics(deals);

    const results = scenarios.map((scenario: { name: string; params: ScenarioParams }) => {
      const adjustedDeals = deals.map(deal => applyScenarioToDeal(deal, scenario.params));
      const scenarioMetrics = calculatePortfolioMetrics(adjustedDeals);
      
      const delta = {
        totalValue: scenarioMetrics.totalValue - baselineMetrics.totalValue,
        totalCashFlow: scenarioMetrics.totalCashFlow - baselineMetrics.totalCashFlow,
        avgYield: scenarioMetrics.avgYield - baselineMetrics.avgYield,
        avgROI: scenarioMetrics.avgROI - baselineMetrics.avgROI,
      };

      const riskFlags = [];
      if (scenarioMetrics.totalCashFlow < 0) {
        riskFlags.push({ severity: 'critical', message: 'Portfolio becomes cash flow negative' });
      }
      if (delta.avgROI < -5) {
        riskFlags.push({ severity: 'high', message: 'ROI drops significantly' });
      }
      if (delta.totalValue < -100000) {
        riskFlags.push({ severity: 'medium', message: 'Substantial equity erosion' });
      }

      return {
        name: scenario.name,
        baseline: baselineMetrics,
        scenario: scenarioMetrics,
        delta,
        riskFlags,
      };
    });

    return new Response(
      JSON.stringify({ results, baseline: baselineMetrics }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Scenario runner error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
