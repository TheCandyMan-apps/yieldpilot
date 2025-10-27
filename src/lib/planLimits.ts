import { supabase } from "@/integrations/supabase/client";

export interface PlanLimits {
  ingests: number;
  exports: number;
}

export interface PlanLimitsMap {
  free: PlanLimits;
  starter: PlanLimits;
  pro: PlanLimits;
  team: PlanLimits;
  [key: string]: PlanLimits;
}

const DEFAULT_LIMITS: PlanLimitsMap = {
  free: { ingests: 5, exports: 2 },
  starter: { ingests: 50, exports: 20 },
  pro: { ingests: 500, exports: 200 },
  team: { ingests: -1, exports: -1 },
};

export async function getPlanLimits(): Promise<PlanLimitsMap> {
  const { data, error } = await supabase
    .from("feature_flags")
    .select("value")
    .eq("key", "plan_limits")
    .maybeSingle();

  if (error || !data) {
    console.warn("[PLAN_LIMITS] Using defaults:", error?.message);
    return DEFAULT_LIMITS;
  }

  const limits = data.value as unknown as PlanLimitsMap;
  return limits || DEFAULT_LIMITS;
}

export async function getUserPlan(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data || data.status !== "active") {
    return "free";
  }

  return data.plan || "free";
}

export async function checkUsageLimit(
  userId: string,
  type: "ingests" | "exports"
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const plan = await getUserPlan(userId);
  const limits = await getPlanLimits();
  const planLimit = limits[plan];

  if (!planLimit) {
    return { allowed: false, used: 0, limit: 0 };
  }

  const limit = type === "ingests" ? planLimit.ingests : planLimit.exports;

  // Unlimited (-1)
  if (limit === -1) {
    return { allowed: true, used: 0, limit: -1 };
  }

  // Get current period usage
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const { data, error } = await supabase
    .from("usage_counters")
    .select("ingests_used, exports_used")
    .eq("user_id", userId)
    .gte("period_start", periodStart.toISOString())
    .lte("period_end", periodEnd.toISOString())
    .maybeSingle();

  const used = data
    ? type === "ingests"
      ? data.ingests_used || 0
      : data.exports_used || 0
    : 0;

  return {
    allowed: used < limit,
    used,
    limit,
  };
}

export async function incrementUsage(
  userId: string,
  type: "ingests" | "exports"
): Promise<void> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const field = type === "ingests" ? "ingests_used" : "exports_used";

  await supabase.rpc("increment_usage_counter", {
    p_user_id: userId,
    p_period_start: periodStart.toISOString(),
    p_period_end: periodEnd.toISOString(),
    p_field: field,
  });
}
