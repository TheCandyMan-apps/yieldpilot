import { supabase } from "@/integrations/supabase/client";

export type SubscriptionTier = "free" | "pro" | "enterprise" | "team";

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  isActive: boolean;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

/**
 * Get current user's subscription status
 */
export async function getSubscriptionStatus(): Promise<SubscriptionStatus | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan, status, current_period_end, cancel_at_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    return {
      tier: "free",
      isActive: true,
      periodEnd: null,
      cancelAtPeriodEnd: false,
    };
  }

  return {
    tier: data.plan as SubscriptionTier,
    isActive: data.status === "active",
    periodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end || false,
  };
}

/**
 * Check if user has access to a feature based on tier
 */
export function hasFeatureAccess(
  userTier: SubscriptionTier,
  requiredTier: SubscriptionTier
): boolean {
  const tierHierarchy: SubscriptionTier[] = ["free", "pro", "enterprise", "team"];
  const userLevel = tierHierarchy.indexOf(userTier);
  const requiredLevel = tierHierarchy.indexOf(requiredTier);
  return userLevel >= requiredLevel;
}

/**
 * Get feature description for a given tier
 */
export function getTierFeatures(tier: SubscriptionTier): string[] {
  const features: Record<SubscriptionTier, string[]> = {
    free: [
      "5 property analyses/month",
      "2 exports/month",
      "Basic deal feed",
      "Market insights",
      "1 lease scan/month",
    ],
    pro: [
      "50 property analyses/month",
      "20 exports/month",
      "Full deal feed access",
      "Saved searches",
      "Email alerts",
      "10 lease scans/month",
    ],
    enterprise: [
      "500 property analyses/month",
      "200 exports/month",
      "Advanced analytics",
      "Priority alerts",
      "Unlimited lease scans",
      "Team collaboration (3 users)",
    ],
    team: [
      "Unlimited analyses",
      "Unlimited exports",
      "Unlimited lease scans",
      "Unlimited team members",
      "API access",
      "White-label reports",
      "Priority support",
    ],
  };
  return features[tier] || features.free;
}

/**
 * Format usage percentage for display
 */
export function formatUsagePercentage(used: number, limit: number): {
  percentage: number;
  color: "success" | "warning" | "danger";
  text: string;
} {
  if (limit === -1) {
    return { percentage: 0, color: "success", text: "Unlimited" };
  }

  const percentage = Math.min(100, (used / limit) * 100);

  let color: "success" | "warning" | "danger" = "success";
  if (percentage >= 90) color = "danger";
  else if (percentage >= 75) color = "warning";

  return {
    percentage,
    color,
    text: `${used} / ${limit}`,
  };
}
