import { supabase } from "@/integrations/supabase/client";

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

const EPC_RATINGS = ["G", "F", "E", "D", "C", "B", "A"];

export async function getRankingWeights(): Promise<RankingWeights> {
  const { data, error } = await supabase
    .from("feature_flags")
    .select("value")
    .eq("key", "ranking_weights")
    .maybeSingle();

  if (error || !data) {
    console.warn("[RANKER] Using default weights:", error?.message);
    return DEFAULT_WEIGHTS;
  }

  const weights = data.value as unknown as RankingWeights;
  return weights || DEFAULT_WEIGHTS;
}

export interface RankFactors {
  net_yield_score: number;
  dscr_score: number;
  cashflow_score: number;
  epc_score: number;
  risk_score: number;
  total: number;
}

export function calculateRankScore(
  kpis: Record<string, any>,
  enrichment: Record<string, any>,
  weights: RankingWeights
): { score: number; factors: RankFactors } {
  // Net Yield Score (target: 12%)
  const netYield = kpis.net_yield || 0;
  const yieldScore = Math.min(100, (netYield / 0.12) * 100);

  // DSCR Score (target: >1.5)
  const dscr = kpis.dscr || 0;
  const dscrScore = Math.min(100, ((dscr - 1.0) / 0.5) * 100);

  // Cashflow Score (target: £500/month)
  const cashflow = kpis.cashflow_pm || 0;
  const cashflowScore = Math.min(100, Math.max(0, (cashflow / 500) * 100));

  // EPC Score
  const epcRating = enrichment.epc_rating || "E";
  const epcIndex = EPC_RATINGS.indexOf(epcRating);
  const epcScore =
    epcIndex >= 0 ? (epcIndex / (EPC_RATINGS.length - 1)) * 100 : 50;

  // Risk Score (start at 100, subtract penalties)
  let riskScore = 100;
  if (enrichment.flood_risk === "high") riskScore -= 30;
  if (enrichment.flood_risk === "medium") riskScore -= 15;
  if (enrichment.crime_score && enrichment.crime_score > 70) riskScore -= 20;
  if (enrichment.lease_years && enrichment.lease_years < 90) riskScore -= 25;
  if (enrichment.days_on_market && enrichment.days_on_market > 120)
    riskScore -= 10;
  riskScore = Math.max(0, riskScore);

  const factors: RankFactors = {
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

export async function rankListing(
  listingId: string,
  kpis: Record<string, any>,
  enrichment: Record<string, any>
): Promise<void> {
  const weights = await getRankingWeights();
  const { score, factors } = calculateRankScore(kpis, enrichment, weights);

  await supabase
    .from("listing_metrics")
    .update({
      rank_score: score,
      factors: factors as any,
      updated_at: new Date().toISOString(),
    })
    .eq("listing_id", listingId);
}

export function getScoreBadgeVariant(
  score: number
): "default" | "secondary" | "destructive" {
  if (score >= 70) return "default";
  if (score >= 50) return "secondary";
  return "destructive";
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Fair";
  return "Poor";
}
