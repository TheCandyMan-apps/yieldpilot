import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScoreResult {
  score: number;
  drivers: string[];
  risks: string[];
  weights: {
    financial: number;
    value: number;
    demand: number;
    risk: number;
    upgrade: number;
  };
  breakdown: {
    financial: number;
    value: number;
    demand: number;
    risk: number;
    upgrade: number;
  };
}

function scoreYield(yieldPct: number): number {
  // UK BTL: <5% weak, 5-7% ok, 7-10% good, >10% excellent
  if (yieldPct >= 10) return 100;
  if (yieldPct >= 7) return 70 + ((yieldPct - 7) / 3) * 30;
  if (yieldPct >= 5) return 40 + ((yieldPct - 5) / 2) * 30;
  return (yieldPct / 5) * 40;
}

function scoreCashflow(cashflow: number): number {
  // £500+/mo excellent, £200-500 good, £0-200 ok, negative bad
  if (cashflow >= 500) return 100;
  if (cashflow >= 200) return 70 + ((cashflow - 200) / 300) * 30;
  if (cashflow >= 0) return 40 + (cashflow / 200) * 30;
  return Math.max(0, 40 + (cashflow / 100) * 40); // Cap at 0
}

function scoreDSCR(dscr: number): number {
  // DSCR: <1.25 risky, 1.25-1.5 acceptable, >1.5 strong
  if (dscr >= 1.5) return 100;
  if (dscr >= 1.25) return 70 + ((dscr - 1.25) / 0.25) * 30;
  if (dscr >= 1.0) return 40 + ((dscr - 1.0) / 0.25) * 30;
  return (dscr / 1.0) * 40;
}

function scoreROI(roi: number): number {
  // ROI: >20% excellent, 15-20% good, 10-15% ok
  if (roi >= 20) return 100;
  if (roi >= 15) return 70 + ((roi - 15) / 5) * 30;
  if (roi >= 10) return 40 + ((roi - 10) / 5) * 30;
  return Math.max(0, (roi / 10) * 40);
}

function calculateScore(listing: any, kpis: any, enrichment: any): ScoreResult {
  const weights = {
    financial: 0.40,
    value: 0.20,
    demand: 0.15,
    risk: 0.15,
    upgrade: 0.10,
  };

  // Financial (40%): Yield, Cashflow, DSCR, ROI
  const yieldScore = scoreYield(kpis.net_yield_pct);
  const cashflowScore = scoreCashflow(kpis.cashflow_monthly);
  const dscrScore = scoreDSCR(kpis.dscr);
  const roiScore = scoreROI(kpis.roi_pct);
  const financialScore = (yieldScore + cashflowScore + dscrScore + roiScore) / 4;

  // Value (20%): Price vs market (mock for now)
  const valueScore = 70; // Mock: assume reasonable value

  // Demand (15%): Area demand index (mock)
  const demandScore = enrichment.area?.demandIndex || 60;

  // Risk (10%): Flood, Crime, EPC (mock)
  const floodRisk = enrichment.risks?.floodTier === "Low" ? 90 : 
                    enrichment.risks?.floodTier === "Med" ? 60 : 30;
  const crimeRisk = enrichment.risks?.crimeIndex 
    ? Math.max(0, 100 - enrichment.risks.crimeIndex) 
    : 70;
  const riskScore = (floodRisk + crimeRisk) / 2;

  // Upgrade (10%): EPC potential (mock)
  const epcScore = enrichment.epc?.band === "A" || enrichment.epc?.band === "B" ? 100 :
                   enrichment.epc?.band === "C" ? 80 :
                   enrichment.epc?.band === "D" ? 60 : 40;

  const breakdown = {
    financial: financialScore,
    value: valueScore,
    demand: demandScore,
    risk: riskScore,
    upgrade: epcScore,
  };

  const totalScore = Math.round(
    financialScore * weights.financial +
    valueScore * weights.value +
    demandScore * weights.demand +
    riskScore * weights.risk +
    epcScore * weights.upgrade
  );

  // Generate drivers and risks
  const drivers: string[] = [];
  const risks: string[] = [];

  if (kpis.net_yield_pct >= 7) drivers.push(`Strong ${kpis.net_yield_pct.toFixed(1)}% net yield`);
  if (kpis.cashflow_monthly >= 200) drivers.push(`Positive £${Math.round(kpis.cashflow_monthly)}/mo cashflow`);
  if (kpis.dscr >= 1.25) drivers.push(`Healthy DSCR ${kpis.dscr.toFixed(2)}`);
  if (demandScore >= 70) drivers.push("High area demand");

  if (kpis.net_yield_pct < 5) risks.push("Low yield (<5%)");
  if (kpis.cashflow_monthly < 0) risks.push("Negative cashflow");
  if (kpis.dscr < 1.25) risks.push("DSCR below lender threshold");
  if (enrichment.epc?.band && ["E", "F", "G"].includes(enrichment.epc.band)) {
    risks.push(`EPC ${enrichment.epc.band} - upgrade required`);
  }
  if (enrichment.risks?.floodTier !== "Low") risks.push("Flood risk present");

  return {
    score: totalScore,
    drivers,
    risks,
    weights,
    breakdown,
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

    const { listingId } = await req.json();

    // Fetch listing with metrics
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("*, listing_metrics(*)")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      throw new Error("Listing not found");
    }

    const metrics = listing.listing_metrics?.[0];
    if (!metrics || !metrics.kpis) {
      throw new Error("KPIs not calculated yet. Run calculate-deal first.");
    }

    const kpis = metrics.kpis;
    const enrichment = metrics.enrichment || {};

    // Calculate score
    const scoreResult = calculateScore(listing, kpis, enrichment);

    // Update listing_metrics
    const { error: updateError } = await supabase
      .from("listing_metrics")
      .update({
        score: scoreResult.score,
        drivers: scoreResult.drivers,
        risks: scoreResult.risks,
        provenance: {
          ...metrics.provenance,
          score: {
            weights: scoreResult.weights,
            breakdown: scoreResult.breakdown,
            timestamp: new Date().toISOString(),
          }
        },
        updated_at: new Date().toISOString(),
      })
      .eq("listing_id", listingId);

    if (updateError) {
      console.error("Error updating score:", updateError);
    }

    return new Response(
      JSON.stringify({ success: true, ...scoreResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in score-deal:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
