import { supabase } from "@/integrations/supabase/client";
import { getPlanFeatures } from "./stripe-config";

export interface Entitlement {
  plan: string;
  features: string[];
  expiresAt?: string;
  isActive: boolean;
}

export async function getEntitlements(userId: string): Promise<Entitlement | null> {
  try {
    const { data, error } = await supabase
      .from('user_entitlements')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    
    if (!data) {
      return {
        plan: 'free',
        features: [],
        isActive: true,
      };
    }

    const isActive = !data.expires_at || new Date(data.expires_at) > new Date();
    const planFeatures = getPlanFeatures(data.plan);
    const customFeatures = (data.features as Record<string, boolean>) || {};
    const allFeatures = [...planFeatures, ...Object.keys(customFeatures).filter(k => customFeatures[k])];

    return {
      plan: data.plan,
      features: allFeatures,
      expiresAt: data.expires_at || undefined,
      isActive,
    };
  } catch (error) {
    console.error('Error fetching entitlements:', error);
    return null;
  }
}

export async function hasFeatureAccess(userId: string, feature: string): Promise<boolean> {
  const entitlement = await getEntitlements(userId);
  if (!entitlement || !entitlement.isActive) return false;
  return entitlement.features.includes(feature);
}

export const PREMIUM_FEATURES = {
  OFFMARKET: 'offmarket',
  STRESS_TESTING: 'stress_testing',
  API_V2: 'api_v2',
  AI_ASSISTANT: 'ai_assistant',
  PORTFOLIO_ANALYTICS: 'portfolio_analytics',
  DEAL_LAB: 'deal_lab',
  AI_TELEMETRY: 'ai_telemetry',
  LEASE_PREMIUM: 'lease_premium',
} as const;
