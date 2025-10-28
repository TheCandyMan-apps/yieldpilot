import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Assumptions {
  deposit_pct: number;
  apr: number;
  term_years: number;
  interest_only: boolean;
  voids_pct: number;
  maintenance_pct: number;
  management_pct: number;
  insurance_annual: number;
}

interface KPIs {
  purchase_price: number;
  deposit: number;
  loan_amount: number;
  monthly_rent: number;
  annual_rent: number;
  
  // Costs
  mortgage_payment_monthly: number;
  voids_cost_monthly: number;
  maintenance_cost_monthly: number;
  management_cost_monthly: number;
  insurance_cost_monthly: number;
  total_costs_monthly: number;
  
  // Returns
  gross_yield_pct: number;
  net_yield_pct: number;
  cashflow_monthly: number;
  cashflow_annual: number;
  roi_pct: number;
  dscr: number;
  
  // Working
  working: {
    deposit: string;
    loan: string;
    mortgage: string;
    opex: string;
    gross_yield: string;
    net_yield: string;
    cashflow: string;
    roi: string;
    dscr: string;
  };
}

function calculateKPIs(price: number, rentMonthly: number, assumptions: Assumptions): KPIs {
  const deposit = price * (assumptions.deposit_pct / 100);
  const loan = price - deposit;
  
  // Mortgage calculation
  let mortgageMonthly: number;
  if (assumptions.interest_only) {
    mortgageMonthly = (loan * assumptions.apr / 100) / 12;
  } else {
    const monthlyRate = assumptions.apr / 100 / 12;
    const numPayments = assumptions.term_years * 12;
    mortgageMonthly = loan * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                      (Math.pow(1 + monthlyRate, numPayments) - 1);
  }
  
  const annualRent = rentMonthly * 12;
  
  // Operating costs
  const voidsMonthly = rentMonthly * (assumptions.voids_pct / 100);
  const maintenanceMonthly = rentMonthly * (assumptions.maintenance_pct / 100);
  const managementMonthly = rentMonthly * (assumptions.management_pct / 100);
  const insuranceMonthly = assumptions.insurance_annual / 12;
  
  const totalCostsMonthly = mortgageMonthly + voidsMonthly + maintenanceMonthly + 
                            managementMonthly + insuranceMonthly;
  
  // Yields
  const grossYield = (annualRent / price) * 100;
  
  const netIncome = annualRent - (voidsMonthly + maintenanceMonthly + managementMonthly + insuranceMonthly) * 12;
  const netYield = ((netIncome - mortgageMonthly * 12) / price) * 100;
  
  const cashflowMonthly = rentMonthly - totalCostsMonthly;
  const cashflowAnnual = cashflowMonthly * 12;
  
  const roi = (cashflowAnnual / deposit) * 100;
  
  // DSCR (Debt Service Coverage Ratio)
  const noi = netIncome;
  const debtService = mortgageMonthly * 12;
  const dscr = debtService > 0 ? noi / debtService : 0;
  
  return {
    purchase_price: price,
    deposit,
    loan_amount: loan,
    monthly_rent: rentMonthly,
    annual_rent: annualRent,
    
    mortgage_payment_monthly: mortgageMonthly,
    voids_cost_monthly: voidsMonthly,
    maintenance_cost_monthly: maintenanceMonthly,
    management_cost_monthly: managementMonthly,
    insurance_cost_monthly: insuranceMonthly,
    total_costs_monthly: totalCostsMonthly,
    
    gross_yield_pct: grossYield,
    net_yield_pct: netYield,
    cashflow_monthly: cashflowMonthly,
    cashflow_annual: cashflowAnnual,
    roi_pct: roi,
    dscr,
    
    working: {
      deposit: `£${price.toLocaleString()} × ${assumptions.deposit_pct}% = £${deposit.toLocaleString()}`,
      loan: `£${price.toLocaleString()} - £${deposit.toLocaleString()} = £${loan.toLocaleString()}`,
      mortgage: assumptions.interest_only 
        ? `£${loan.toLocaleString()} × ${assumptions.apr}% ÷ 12 = £${mortgageMonthly.toFixed(2)}/mo`
        : `£${loan.toLocaleString()} @ ${assumptions.apr}% over ${assumptions.term_years}y = £${mortgageMonthly.toFixed(2)}/mo`,
      opex: `Voids ${assumptions.voids_pct}% + Maint ${assumptions.maintenance_pct}% + Mgmt ${assumptions.management_pct}% + Ins £${assumptions.insurance_annual}/yr`,
      gross_yield: `(£${annualRent.toLocaleString()} / £${price.toLocaleString()}) × 100 = ${grossYield.toFixed(2)}%`,
      net_yield: `((£${annualRent.toLocaleString()} - OpEx - Interest) / £${price.toLocaleString()}) × 100 = ${netYield.toFixed(2)}%`,
      cashflow: `£${rentMonthly.toLocaleString()} - £${totalCostsMonthly.toFixed(2)} = £${cashflowMonthly.toFixed(2)}/mo`,
      roi: `(£${cashflowAnnual.toFixed(2)} / £${deposit.toLocaleString()}) × 100 = ${roi.toFixed(2)}%`,
      dscr: `£${noi.toFixed(2)} NOI / £${debtService.toFixed(2)} debt = ${dscr.toFixed(2)}`,
    }
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { listingId, customAssumptions } = await req.json();

    // Fetch listing
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("*, listing_metrics(*)")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      throw new Error("Listing not found");
    }

    // Get assumptions (custom or default)
    const defaultAssumptions: Assumptions = {
      deposit_pct: 25,
      apr: 5.5,
      term_years: 25,
      interest_only: true,
      voids_pct: 5,
      maintenance_pct: 8,
      management_pct: 10,
      insurance_annual: 300,
    };

    const assumptions = customAssumptions || 
                       (listing.listing_metrics?.[0]?.assumptions as Assumptions) || 
                       defaultAssumptions;

    // Get rent estimate from enrichment
    const enrichment = listing.listing_metrics?.[0]?.enrichment || {};
    const rentEstimate = enrichment.area?.rentRef || listing.price * 0.005;

    // Calculate KPIs
    const kpis = calculateKPIs(listing.price, rentEstimate, assumptions);

    // Update listing_metrics
    const { error: updateError } = await supabase
      .from("listing_metrics")
      .upsert({
        listing_id: listingId,
        assumptions,
        kpis,
        updated_at: new Date().toISOString(),
      });

    if (updateError) {
      console.error("Error updating metrics:", updateError);
    }

    return new Response(
      JSON.stringify({ success: true, kpis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in calculate-deal:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
