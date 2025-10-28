/**
 * Portfolio Scenario Modeling
 * Run "what-if" analyses on portfolios with different assumptions
 */

export interface ScenarioParameters {
  name: string;
  interest_rate_change_bps?: number; // basis points change (+100 = +1%)
  rent_change_pct?: number; // percentage change
  void_rate_change_pct?: number;
  maintenance_change_pct?: number;
  property_value_change_pct?: number;
  include_capex?: boolean;
}

export interface PortfolioMetrics {
  total_value: number;
  total_equity: number;
  total_debt: number;
  monthly_income: number;
  monthly_expenses: number;
  monthly_cashflow: number;
  annual_cashflow: number;
  portfolio_yield: number;
  portfolio_roi: number;
  avg_dscr: number;
  properties_count: number;
}

export interface ScenarioResult {
  scenario_name: string;
  parameters: ScenarioParameters;
  baseline_metrics: PortfolioMetrics;
  scenario_metrics: PortfolioMetrics;
  delta: {
    monthly_cashflow: number;
    annual_cashflow: number;
    portfolio_yield: number;
    avg_dscr: number;
  };
  risk_flags: string[];
}

/**
 * Apply scenario parameters to individual deal KPIs
 */
export function applyScenarioToDeal(
  kpis: any,
  params: ScenarioParameters,
  propertyPrice: number,
  assumptions: any
): any {
  if (!kpis?.working) return kpis;

  const working = { ...kpis.working };

  // Apply interest rate change
  if (params.interest_rate_change_bps) {
    const newRate = (assumptions.apr || 5.5) + params.interest_rate_change_bps / 100;
    const loanAmount = propertyPrice * (1 - (assumptions.deposit_pct || 25) / 100);
    
    if (assumptions.interest_only) {
      working.monthly_mortgage = (loanAmount * newRate / 100) / 12;
    } else {
      const monthlyRate = newRate / 100 / 12;
      const numPayments = (assumptions.term_years || 25) * 12;
      working.monthly_mortgage = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
    }
  }

  // Apply rent change
  if (params.rent_change_pct) {
    working.monthly_rental_income = (working.monthly_rental_income || 0) * (1 + params.rent_change_pct / 100);
    working.annual_rental_income = working.monthly_rental_income * 12;
  }

  // Apply void rate change
  if (params.void_rate_change_pct !== undefined) {
    const newVoidRate = (assumptions.voids_pct || 5) + params.void_rate_change_pct;
    const void_cost = working.monthly_rental_income * (newVoidRate / 100);
    working.monthly_voids = void_cost;
  }

  // Apply maintenance change
  if (params.maintenance_change_pct !== undefined) {
    const newMaintenanceRate = (assumptions.maintenance_pct || 8) + params.maintenance_change_pct;
    working.monthly_maintenance = working.monthly_rental_income * (newMaintenanceRate / 100);
  }

  // Recalculate operating costs
  working.monthly_operating_costs = 
    (working.monthly_management || 0) +
    (working.monthly_maintenance || 0) +
    (working.monthly_voids || 0) +
    (working.monthly_insurance || 0);

  // Recalculate net cashflow
  working.net_monthly_cashflow = 
    (working.monthly_rental_income || 0) -
    (working.monthly_mortgage || 0) -
    (working.monthly_operating_costs || 0);

  working.annual_cashflow = working.net_monthly_cashflow * 12;

  // Recalculate yields
  if (working.total_investment > 0) {
    working.net_yield_pct = (working.annual_cashflow / working.total_investment) * 100;
  }

  // Recalculate DSCR
  if (working.monthly_mortgage && working.monthly_mortgage > 0) {
    const operating_income = (working.monthly_rental_income || 0) - (working.monthly_operating_costs || 0);
    working.dscr = operating_income / working.monthly_mortgage;
  }

  // Apply property value change
  if (params.property_value_change_pct) {
    const newValue = propertyPrice * (1 + params.property_value_change_pct / 100);
    working.current_value = newValue;
    if (propertyPrice > 0) {
      working.gross_yield_pct = (working.annual_rental_income / newValue) * 100;
    }
  }

  return {
    ...kpis,
    working,
  };
}

/**
 * Calculate portfolio-level metrics from individual deals
 */
export function calculatePortfolioMetrics(deals: any[]): PortfolioMetrics {
  let total_value = 0;
  let total_equity = 0;
  let total_debt = 0;
  let monthly_income = 0;
  let monthly_expenses = 0;
  let monthly_cashflow = 0;
  let total_dscr = 0;
  let dscr_count = 0;

  deals.forEach(deal => {
    const kpis = deal.listing_metrics?.kpis?.working;
    if (!kpis) return;

    const price = deal.price || 0;
    const deposit = (deal.listing_metrics?.assumptions?.deposit_pct || 25) / 100;
    
    total_value += price;
    total_equity += price * deposit;
    total_debt += price * (1 - deposit);
    
    monthly_income += kpis.monthly_rental_income || 0;
    monthly_expenses += (kpis.monthly_mortgage || 0) + (kpis.monthly_operating_costs || 0);
    monthly_cashflow += kpis.net_monthly_cashflow || 0;

    if (kpis.dscr) {
      total_dscr += kpis.dscr;
      dscr_count++;
    }
  });

  const annual_cashflow = monthly_cashflow * 12;
  const portfolio_yield = total_equity > 0 ? (annual_cashflow / total_equity) * 100 : 0;
  const portfolio_roi = total_equity > 0 ? (annual_cashflow / total_equity) * 100 : 0;
  const avg_dscr = dscr_count > 0 ? total_dscr / dscr_count : 0;

  return {
    total_value,
    total_equity,
    total_debt,
    monthly_income,
    monthly_expenses,
    monthly_cashflow,
    annual_cashflow,
    portfolio_yield,
    portfolio_roi,
    avg_dscr,
    properties_count: deals.length,
  };
}

/**
 * Run scenario analysis on portfolio
 */
export function runScenarioAnalysis(
  deals: any[],
  params: ScenarioParameters
): ScenarioResult {
  // Calculate baseline
  const baseline_metrics = calculatePortfolioMetrics(deals);

  // Apply scenario to each deal
  const scenario_deals = deals.map(deal => {
    if (!deal.listing_metrics?.kpis) return deal;

    const scenario_kpis = applyScenarioToDeal(
      deal.listing_metrics.kpis,
      params,
      deal.price,
      deal.listing_metrics.assumptions
    );

    return {
      ...deal,
      listing_metrics: {
        ...deal.listing_metrics,
        kpis: scenario_kpis,
      },
    };
  });

  // Calculate scenario metrics
  const scenario_metrics = calculatePortfolioMetrics(scenario_deals);

  // Calculate deltas
  const delta = {
    monthly_cashflow: scenario_metrics.monthly_cashflow - baseline_metrics.monthly_cashflow,
    annual_cashflow: scenario_metrics.annual_cashflow - baseline_metrics.annual_cashflow,
    portfolio_yield: scenario_metrics.portfolio_yield - baseline_metrics.portfolio_yield,
    avg_dscr: scenario_metrics.avg_dscr - baseline_metrics.avg_dscr,
  };

  // Identify risk flags
  const risk_flags: string[] = [];
  
  if (scenario_metrics.avg_dscr < 1.0) {
    risk_flags.push('Portfolio average DSCR below 1.0 - refinancing risk');
  }
  
  if (scenario_metrics.monthly_cashflow < 0) {
    risk_flags.push('Negative portfolio cashflow - liquidity risk');
  }
  
  if (scenario_metrics.portfolio_yield < 5) {
    risk_flags.push('Portfolio yield below 5% - opportunity cost risk');
  }

  if (delta.annual_cashflow < -50000) {
    risk_flags.push('Significant cashflow reduction (>£50k p.a.) - stress scenario');
  }

  return {
    scenario_name: params.name,
    parameters: params,
    baseline_metrics,
    scenario_metrics,
    delta,
    risk_flags,
  };
}

/**
 * Common UK market scenarios
 */
export const UK_SCENARIOS: ScenarioParameters[] = [
  {
    name: 'Interest Rate Shock (+2%)',
    interest_rate_change_bps: 200,
  },
  {
    name: 'Rental Market Softening (-10%)',
    rent_change_pct: -10,
  },
  {
    name: 'Increased Maintenance (EPC compliance)',
    maintenance_change_pct: 3,
  },
  {
    name: 'Perfect Storm (rates +1.5%, rent -5%, voids +2%)',
    interest_rate_change_bps: 150,
    rent_change_pct: -5,
    void_rate_change_pct: 2,
  },
  {
    name: 'Market Recovery (rates -1%, rent +5%, value +8%)',
    interest_rate_change_bps: -100,
    rent_change_pct: 5,
    property_value_change_pct: 8,
  },
  {
    name: 'High Void Scenario (+5%)',
    void_rate_change_pct: 5,
  },
];

/**
 * Format scenario delta for display
 */
export function formatScenarioDelta(value: number, isPercent: boolean = false): string {
  const prefix = value >= 0 ? '+' : '';
  if (isPercent) {
    return `${prefix}${value.toFixed(2)}%`;
  }
  return `${prefix}£${Math.abs(value).toLocaleString()}`;
}
