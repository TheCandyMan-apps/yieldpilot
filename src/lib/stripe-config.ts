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

export const STRIPE_ADDONS = {
  premium_data_credits: {
    priceId: 'price_premium_data_credits_placeholder',
    name: 'Premium Data Credits',
    description: '100 credits for ownership, zoning & demographic data',
    amount: 2900, // £29.00
    credits: 100,
  },
  portfolio_pro: {
    priceId: 'price_portfolio_pro_placeholder',
    name: 'Portfolio Pro Add-on',
    description: 'Advanced analytics for up to 10 properties',
    amount: 3900, // £39.00/month
  },
  marketplace_featured: {
    priceId: 'price_marketplace_featured_placeholder',
    name: 'Marketplace Featured Listing',
    description: 'Feature your services for 30 days',
    amount: 14900, // £149.00/month
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
