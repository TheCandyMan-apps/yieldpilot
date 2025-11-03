// Stripe Product and Price Configuration
// ⚠️ IMPORTANT: Update these with your actual Stripe Price IDs from the Stripe Dashboard
// These placeholder values will cause payment failures in production!
// 
// Steps to configure:
// 1. Create products in Stripe Dashboard (Products → Create Product)
// 2. Copy the real price IDs (format: price_xxxxxxxxxxxxx)
// 3. Replace all placeholder values below
// 4. Update PLAN_MAPPING in supabase/functions/billing-webhooks/index.ts with real product IDs

export const STRIPE_PRODUCTS = {
  pro_monthly: {
    priceId: 'price_pro_monthly_placeholder',
    name: 'Pro Monthly',
    features: ['offmarket', 'stress_testing', 'api_v2', 'ai_assistant'],
  },
  pro: {
    priceId: 'price_pro_placeholder',
    name: 'Pro',
    features: ['offmarket', 'stress_testing', 'api_v2', 'ai_assistant'],
  },
  investor_monthly: {
    priceId: 'price_investor_monthly_placeholder',
    name: 'Investor Monthly',
    features: ['offmarket', 'stress_testing', 'api_v2', 'ai_assistant', 'portfolio_analytics', 'deal_lab'],
  },
  investor: {
    priceId: 'price_investor_placeholder',
    name: 'Investor',
    features: ['offmarket', 'stress_testing', 'api_v2', 'ai_assistant', 'portfolio_analytics', 'deal_lab', 'ai_telemetry', 'lease_premium'],
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
  tenant_screening_basic: {
    priceId: 'price_tenant_screening_basic_placeholder',
    name: 'Basic Tenant Screening',
    description: 'Credit check and employment verification',
    amount: 2900, // £29.00
  },
  tenant_screening_enhanced: {
    priceId: 'price_tenant_screening_enhanced_placeholder',
    name: 'Enhanced Tenant Screening',
    description: 'Full background check with references',
    amount: 4900, // £49.00
  },
  api_license_starter: {
    priceId: 'price_api_starter_placeholder',
    name: 'API License - Starter',
    description: '1,000 API calls per month',
    amount: 9900, // £99.00/month
  },
  api_license_professional: {
    priceId: 'price_api_professional_placeholder',
    name: 'API License - Professional',
    description: '10,000 API calls per month',
    amount: 29900, // £299.00/month
  },
  api_license_enterprise: {
    priceId: 'price_api_enterprise_placeholder',
    name: 'API License - Enterprise',
    description: 'Unlimited API calls with dedicated support',
    amount: 99900, // £999.00/month
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

// Validate configuration in production
if (typeof window === 'undefined' && typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
  const hasPlaceholders = [
    ...Object.values(STRIPE_PRODUCTS),
    ...Object.values(STRIPE_ADDONS),
    ...Object.values(STRIPE_ONE_TIME)
  ].some((item: any) => item.priceId?.includes('placeholder'));
  
  if (hasPlaceholders) {
    console.error('⚠️ WARNING: Stripe configuration contains placeholder price IDs. Payment flows will fail.');
  }
}

export type SubscriptionPlan = keyof typeof STRIPE_PRODUCTS;
export type OneTimePurchase = keyof typeof STRIPE_ONE_TIME;

export function getPlanFeatures(plan: string): readonly string[] {
  if (plan in STRIPE_PRODUCTS) {
    return STRIPE_PRODUCTS[plan as SubscriptionPlan].features;
  }
  return [];
}
