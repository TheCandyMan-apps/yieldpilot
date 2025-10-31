// Stripe Product and Price Configuration
// Update these with your actual Stripe Price IDs from the Stripe Dashboard

export const STRIPE_PRODUCTS = {
  pro_monthly: {
    priceId: 'price_pro_monthly_placeholder',
    name: 'Pro Monthly',
    features: ['offmarket', 'stress_testing', 'api_v2', 'ai_assistant'],
  },
  investor_monthly: {
    priceId: 'price_investor_monthly_placeholder',
    name: 'Investor Monthly',
    features: ['offmarket', 'stress_testing', 'api_v2', 'ai_assistant', 'portfolio_analytics', 'deal_lab'],
  },
  deal_lab_monthly: {
    priceId: 'price_deal_lab_monthly_placeholder',
    name: 'Deal Lab Monthly',
    features: ['offmarket', 'stress_testing', 'api_v2', 'ai_assistant', 'portfolio_analytics', 'deal_lab', 'ai_telemetry'],
  },
} as const;

export const STRIPE_ONE_TIME = {
  ai_lease_report: {
    priceId: 'price_ai_lease_report_placeholder',
    name: 'AI Lease Report',
    amount: 4900, // $49.00
  },
  due_diligence_pack: {
    priceId: 'price_due_diligence_pack_placeholder',
    name: 'Due Diligence Pack',
    amount: 9900, // $99.00
  },
} as const;

export type SubscriptionPlan = keyof typeof STRIPE_PRODUCTS;
export type OneTimePurchase = keyof typeof STRIPE_ONE_TIME;

export function getPlanFeatures(plan: string): readonly string[] {
  if (plan in STRIPE_PRODUCTS) {
    return STRIPE_PRODUCTS[plan as SubscriptionPlan].features;
  }
  return [];
}
