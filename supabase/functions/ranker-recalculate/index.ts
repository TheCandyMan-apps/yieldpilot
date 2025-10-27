import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RankingWeights {
  net_yield: number;
  dscr: number;
  cashflow_pm: number;
  epc: number;
  risk: number;
}

const DEFAULT_WEIGHTS: RankingWeights = {
  net_yield: 0.35,
  dscr: 0.25,
  cashflow_pm: 0.2,
  epc: 0.1,
  risk: 0.1,
};

const EPC_RATINGS = ['G', 'F', 'E', 'D', 'C', 'B', 'A'];

function calculateRankScore(
  kpis: Record<string, any>,
  enrichment: Record<string, any>,
  weights: RankingWeights
): { score: number; factors: any } {
  const netYield = kpis.net_yield || 0;
  const yieldScore = Math.min(100, (netYield / 0.12) * 100);

  const dscr = kpis.dscr || 0;
  const dscrScore = Math.min(100, ((dscr - 1.0) / 0.5) * 100);

  const cashflow = kpis.cashflow_pm || 0;
  const cashflowScore = Math.min(100, Math.max(0, (cashflow / 500) * 100));

  const epcRating = enrichment.epc_rating || 'E';
  const epcIndex = EPC_RATINGS.indexOf(epcRating);
  const epcScore = epcIndex >= 0 ? (epcIndex / (EPC_RATINGS.length - 1)) * 100 : 50;

  let riskScore = 100;
  if (enrichment.flood_risk === 'high') riskScore -= 30;
  if (enrichment.flood_risk === 'medium') riskScore -= 15;
  if (enrichment.crime_score && enrichment.crime_score > 70) riskScore -= 20;
  if (enrichment.lease_years && enrichment.lease_years < 90) riskScore -= 25;
  if (enrichment.days_on_market && enrichment.days_on_market > 120) riskScore -= 10;
  riskScore = Math.max(0, riskScore);

  const factors = {
    net_yield_score: yieldScore,
    dscr_score: dscrScore,
    cashflow_score: cashflowScore,
    epc_score: epcScore,
    risk_score: riskScore,
    total: 0,
  };

  factors.total =
    yieldScore * weights.net_yield +
    dscrScore * weights.dscr +
    cashflowScore * weights.cashflow_pm +
    epcScore * weights.epc +
    riskScore * weights.risk;

  return { score: factors.total, factors };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get weights from feature flags
    const { data: flagData } = await supabase
      .from("feature_flags")
      .select("value")
      .eq("key", "ranking_weights")
      .single();

    const weights = (flagData?.value as RankingWeights) || DEFAULT_WEIGHTS;

    console.log("[RANKER] Using weights:", weights);

    // Get all listing metrics
    const { data: metrics, error } = await supabase
      .from("listing_metrics")
      .select("id, listing_id, kpis, enrichment");

    if (error) throw error;

    let processed = 0;
    let errors = 0;

    for (const metric of metrics || []) {
      try {
        const { score, factors } = calculateRankScore(
          metric.kpis || {},
          metric.enrichment || {},
          weights
        );

        await supabase
          .from("listing_metrics")
          .update({
            rank_score: score,
            factors: factors,
            updated_at: new Date().toISOString(),
          })
          .eq("id", metric.id);

        processed++;
      } catch (e) {
        console.error(`Error ranking listing ${metric.listing_id}:`, e);
        errors++;
      }
    }

    console.log(`[RANKER] Processed: ${processed}, Errors: ${errors}`);

    return new Response(
      JSON.stringify({ ok: true, processed, errors }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[RANKER] Error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
