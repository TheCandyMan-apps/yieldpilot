import { supabase } from "@/integrations/supabase/client";

export interface RankingWeights {
  net_yield: number;
  dscr: number;
  cashflow_pm: number;
  epc: number;
  risk: number;
}

export interface RankingFactors {
  net_yield_score: number;
  dscr_score: number;
  cashflow_score: number;
  epc_score: number;
  risk_score: number;
  total: number;
}

const DEFAULT_WEIGHTS: RankingWeights = {
  net_yield: 0.35,
  dscr: 0.25,
  cashflow_pm: 0.2,
  epc: 0.1,
  risk: 0.1,
};

const EPC_RATINGS = ['G', 'F', 'E', 'D', 'C', 'B', 'A'];

export async function getRankingWeights(): Promise<RankingWeights> {
  const { data } = await supabase
    .from("feature_flags")
    .select("value")
    .eq("key", "ranking_weights")
    .single();

  return (data?.value as RankingWeights) || DEFAULT_WEIGHTS;
}

export function calculateRankScore(
  kpis: Record<string, any>,
  enrichment: Record<string, any>,
  weights: RankingWeights
): { score: number; factors: RankingFactors } {
  // 1. Net Yield Score (0-100)
  const netYield = kpis.net_yield || 0;
  const yieldScore = Math.min(100, (netYield / 0.12) * 100); // 12% = 100 points

  // 2. DSCR Score (0-100)
  const dscr = kpis.dscr || 0;
  const dscrScore = Math.min(100, ((dscr - 1.0) / 0.5) * 100); // DSCR 1.5+ = 100 points

  // 3. Cashflow Score (0-100)
  const cashflow = kpis.cashflow_pm || 0;
  const cashflowScore = Math.min(100, Math.max(0, (cashflow / 500) * 100)); // £500/mo = 100 points

  // 4. EPC Score (0-100)
  const epcRating = enrichment.epc_rating || 'E';
  const epcIndex = EPC_RATINGS.indexOf(epcRating);
  const epcScore = epcIndex >= 0 ? (epcIndex / (EPC_RATINGS.length - 1)) * 100 : 50;

  // 5. Risk Score (0-100, higher is better = lower risk)
  let riskScore = 100;
  
  // Penalties
  if (enrichment.flood_risk === 'high') riskScore -= 30;
  if (enrichment.flood_risk === 'medium') riskScore -= 15;
  if (enrichment.crime_score && enrichment.crime_score > 70) riskScore -= 20;
  if (enrichment.lease_years && enrichment.lease_years < 90) riskScore -= 25;
  if (enrichment.days_on_market && enrichment.days_on_market > 120) riskScore -= 10;

  riskScore = Math.max(0, riskScore);

  // Weighted total
  const factors: RankingFactors = {
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

export async function recalculateListingRank(listingId: string): Promise<void> {
  const weights = await getRankingWeights();

  // Fetch listing metrics
  const { data: metrics } = await supabase
    .from("listing_metrics")
    .select("kpis, enrichment")
    .eq("listing_id", listingId)
    .single();

  if (!metrics) {
    console.warn(`No metrics found for listing ${listingId}`);
    return;
  }

  const { score, factors } = calculateRankScore(
    metrics.kpis || {},
    metrics.enrichment || {},
    weights
  );

  // Update rank_score and factors
  await supabase
    .from("listing_metrics")
    .update({
      rank_score: score,
      factors: factors as any,
      updated_at: new Date().toISOString(),
    })
    .eq("listing_id", listingId);
}

export async function recalculateAllRanks(): Promise<{ processed: number; errors: number }> {
  const weights = await getRankingWeights();
  
  // Get all listings with metrics
  const { data: metrics, error } = await supabase
    .from("listing_metrics")
    .select("id, listing_id, kpis, enrichment");

  if (error || !metrics) {
    console.error("Failed to fetch metrics:", error);
    return { processed: 0, errors: 1 };
  }

  let processed = 0;
  let errors = 0;

  for (const metric of metrics) {
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
          factors: factors as any,
          updated_at: new Date().toISOString(),
        })
        .eq("id", metric.id);

      processed++;
    } catch (e) {
      console.error(`Error ranking listing ${metric.listing_id}:`, e);
      errors++;
    }
  }

  return { processed, errors };
}
