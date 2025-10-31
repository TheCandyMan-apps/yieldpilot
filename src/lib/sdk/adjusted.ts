/**
 * Adjusted Metrics API Client
 * 
 * Typed client for regulation-adjusted ROI endpoints.
 */

import { supabase } from '@/integrations/supabase/client';

export interface AdjustedMetrics {
  listing_id: string;
  adjusted_net_yield_pct: number;
  after_tax_cashflow: number;
  tax_due: number;
  epc_upgrade_annual: number;
  score_adjusted: number;
  explain_json: {
    tax_method: string;
    tax_due: number;
    epc_cost_annual: number;
    epc_gap: boolean;
    licensing_annual: number;
    penalties_applied: (string | null)[];
  };
}

export interface EPCAdvisorResponse {
  listing_id: string;
  current_epc: string;
  target_epc: string;
  epc_gap: number;
  recommended_measures: string[];
  cost_estimate_min: number;
  cost_estimate_max: number;
  cost_estimate_median: number;
  amort_years: number;
  monthly_cost: number;
  expected_yield_uplift_pct: number;
  payback_years: number;
  note?: string;
}

export interface StrategySimResponse {
  listing_id: string;
  strategy_key: string;
  strategy_label: string;
  assumptions: Record<string, any>;
  metrics: {
    initial_investment: number;
    monthly_cashflow: number;
    annual_cashflow: number;
    dscr: number;
    cash_on_cash_return_pct: number;
    irr_10yr_pct: number;
    equity_multiple: number;
    breakeven_occupancy_pct: number;
    refi_year?: number;
    exit_year: number;
  };
  projection_10yr: Array<{
    year: number;
    property_value: number;
    debt_balance: number;
    equity: number;
    annual_cashflow: number;
    cumulative_cashflow: number;
  }>;
}

/**
 * Fetch adjusted metrics for a listing
 */
export async function getAdjustedMetrics(listingId: string): Promise<AdjustedMetrics | null> {
  const { data, error } = await supabase.rpc('get_adjusted_metrics', {
    p_listing_id: listingId
  });

  if (error) {
    console.error('Error fetching adjusted metrics:', error);
    return null;
  }

  return data as AdjustedMetrics;
}

/**
 * Get EPC retrofit advice
 */
export async function getEPCAdvice(
  listingId: string,
  target: string = 'C'
): Promise<EPCAdvisorResponse> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) {
    throw new Error('Authentication required');
  }

  const { data, error } = await supabase.functions.invoke('epc-advisor', {
    body: { listing_id: listingId, target },
  });

  if (error) throw error;
  return data as EPCAdvisorResponse;
}

/**
 * Run strategy simulation
 */
export async function runStrategySimulation(
  listingId: string,
  strategyKey: string,
  overrides?: Record<string, any>
): Promise<StrategySimResponse> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) {
    throw new Error('Authentication required');
  }

  const { data, error } = await supabase.functions.invoke('strategy-sim', {
    body: {
      listing_id: listingId,
      strategy_key: strategyKey,
      overrides,
    },
  });

  if (error) throw error;
  return data as StrategySimResponse;
}

/**
 * Recompute adjusted metrics (admin/power users)
 */
export async function recomputeAdjustedMetrics(
  listingId?: string,
  batchSize: number = 100
): Promise<{ success: boolean; processed: number; duration_ms: number }> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) {
    throw new Error('Authentication required');
  }

  const { data, error } = await supabase.functions.invoke('adjusted-recompute', {
    body: { listing_id: listingId, batch_size: batchSize },
  });

  if (error) throw error;
  return data;
}
