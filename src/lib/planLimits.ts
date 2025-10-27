import { supabase } from "@/integrations/supabase/client";

export interface PlanLimits {
  ingests_per_month: number;
  saved_searches: number;
  exports: boolean | "csv" | "all";
  priority_queue?: boolean;
  team_seats?: number;
}

export const DEFAULT_PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    ingests_per_month: 10,
    saved_searches: 2,
    exports: false,
  },
  starter: {
    ingests_per_month: 100,
    saved_searches: 10,
    exports: "csv",
  },
  pro: {
    ingests_per_month: 500,
    saved_searches: 50,
    exports: "all",
    priority_queue: true,
  },
  investor: {
    ingests_per_month: 500,
    saved_searches: 50,
    exports: "all",
    priority_queue: true,
  },
  team: {
    ingests_per_month: 2000,
    saved_searches: 200,
    exports: "all",
    priority_queue: true,
    team_seats: 5,
  },
};

export async function getPlanLimits(tier: string): Promise<PlanLimits> {
  // Try to get from feature flags first
  const { data: flag } = await supabase
    .from("feature_flags")
    .select("value")
    .eq("key", "plan_limits")
    .single();

  if (flag?.value && flag.value[tier]) {
    return flag.value[tier] as PlanLimits;
  }

  return DEFAULT_PLAN_LIMITS[tier] || DEFAULT_PLAN_LIMITS.free;
}

export async function canIngest(userId: string): Promise<{ allowed: boolean; reason?: string; used: number; limit: number }> {
  // Get user's subscription tier
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", userId)
    .single();

  const tier = profile?.subscription_tier || "free";
  const limits = await getPlanLimits(tier);

  // Get current period start (first day of current month)
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodStartStr = periodStart.toISOString().split('T')[0];

  // Get or create usage counter
  const { data: usage, error: usageError } = await supabase
    .from("usage_counters")
    .select("*")
    .eq("user_id", userId)
    .eq("period_start", periodStartStr)
    .single();

  const used = usage?.ingests_used || 0;
  const limit = limits.ingests_per_month;

  if (used >= limit) {
    return {
      allowed: false,
      reason: `Monthly limit of ${limit} ingests reached. Upgrade to get more.`,
      used,
      limit,
    };
  }

  return { allowed: true, used, limit };
}

export async function incrementIngestUsage(userId: string): Promise<void> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodStartStr = periodStart.toISOString().split('T')[0];

  // Upsert usage counter
  await supabase
    .from("usage_counters")
    .upsert({
      user_id: userId,
      period_start: periodStartStr,
      ingests_used: 1,
    }, {
      onConflict: 'user_id,period_start',
      ignoreDuplicates: false,
    })
    .then(async ({ error }) => {
      if (error) {
        // If exists, increment
        await supabase.rpc('increment', {
          row_id: userId,
          x: 1,
        });
      }
    });
}
