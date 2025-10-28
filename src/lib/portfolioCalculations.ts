/**
 * Portfolio-level calculations and aggregations
 */

export interface PortfolioSummary {
  total_properties: number;
  total_value: number;
  total_equity: number;
  total_debt: number;
  ltv_avg: number;
  monthly_income: number;
  monthly_expenses: number;
  net_monthly_cashflow: number;
  annual_cashflow: number;
  portfolio_yield: number;
  portfolio_roi: number;
  avg_net_yield: number;
  avg_dscr: number;
  properties_negative_cashflow: number;
  properties_below_dscr_125: number;
  best_performer: string | null;
  worst_performer: string | null;
}

/**
 * Calculate portfolio summary from deals
 */
export function calculatePortfolioSummary(deals: any[]): PortfolioSummary {
  if (deals.length === 0) {
    return {
      total_properties: 0,
      total_value: 0,
      total_equity: 0,
      total_debt: 0,
      ltv_avg: 0,
      monthly_income: 0,
      monthly_expenses: 0,
      net_monthly_cashflow: 0,
      annual_cashflow: 0,
      portfolio_yield: 0,
      portfolio_roi: 0,
      avg_net_yield: 0,
      avg_dscr: 0,
      properties_negative_cashflow: 0,
      properties_below_dscr_125: 0,
      best_performer: null,
      worst_performer: null,
    };
  }

  let total_value = 0;
  let total_equity = 0;
  let total_debt = 0;
  let monthly_income = 0;
  let monthly_expenses = 0;
  let net_monthly_cashflow = 0;
  let yield_sum = 0;
  let dscr_sum = 0;
  let yield_count = 0;
  let dscr_count = 0;
  let properties_negative_cashflow = 0;
  let properties_below_dscr_125 = 0;

  let best_performer: { address: string; yield: number } | null = null;
  let worst_performer: { address: string; yield: number } | null = null;

  deals.forEach(deal => {
    const price = deal.price || 0;
    const kpis = deal.listing_metrics?.kpis;
    const assumptions = deal.listing_metrics?.assumptions;
    
    if (!kpis?.working) return;

    const working = kpis.working;
    const deposit_pct = assumptions?.deposit_pct || 25;
    
    // Aggregations
    total_value += price;
    const equity = price * (deposit_pct / 100);
    const debt = price * (1 - deposit_pct / 100);
    total_equity += equity;
    total_debt += debt;

    monthly_income += working.monthly_rental_income || 0;
    const property_expenses = (working.monthly_mortgage || 0) + (working.monthly_operating_costs || 0);
    monthly_expenses += property_expenses;
    
    const property_cashflow = working.net_monthly_cashflow || 0;
    net_monthly_cashflow += property_cashflow;

    // Track negative cashflow properties
    if (property_cashflow < 0) {
      properties_negative_cashflow++;
    }

    // Yield tracking
    if (working.net_yield_pct !== undefined && working.net_yield_pct !== null) {
      yield_sum += working.net_yield_pct;
      yield_count++;

      // Track best/worst
      if (!best_performer || working.net_yield_pct > best_performer.yield) {
        best_performer = { address: deal.property_address, yield: working.net_yield_pct };
      }
      if (!worst_performer || working.net_yield_pct < worst_performer.yield) {
        worst_performer = { address: deal.property_address, yield: working.net_yield_pct };
      }
    }

    // DSCR tracking
    if (working.dscr !== undefined && working.dscr !== null) {
      dscr_sum += working.dscr;
      dscr_count++;

      if (working.dscr < 1.25) {
        properties_below_dscr_125++;
      }
    }
  });

  const annual_cashflow = net_monthly_cashflow * 12;
  const portfolio_yield = total_equity > 0 ? (annual_cashflow / total_equity) * 100 : 0;
  const portfolio_roi = total_equity > 0 ? (annual_cashflow / total_equity) * 100 : 0;
  const avg_net_yield = yield_count > 0 ? yield_sum / yield_count : 0;
  const avg_dscr = dscr_count > 0 ? dscr_sum / dscr_count : 0;
  const ltv_avg = total_value > 0 ? (total_debt / total_value) * 100 : 0;

  return {
    total_properties: deals.length,
    total_value,
    total_equity,
    total_debt,
    ltv_avg,
    monthly_income,
    monthly_expenses,
    net_monthly_cashflow,
    annual_cashflow,
    portfolio_yield,
    portfolio_roi,
    avg_net_yield,
    avg_dscr,
    properties_negative_cashflow,
    properties_below_dscr_125,
    best_performer: best_performer?.address || null,
    worst_performer: worst_performer?.address || null,
  };
}

/**
 * Format currency (GBP)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Get health score for portfolio (0-100)
 */
export function getPortfolioHealthScore(summary: PortfolioSummary): number {
  let score = 100;

  // Deduct for negative cashflow properties
  score -= summary.properties_negative_cashflow * 10;

  // Deduct for low DSCR properties
  score -= summary.properties_below_dscr_125 * 5;

  // Deduct for low portfolio yield
  if (summary.portfolio_yield < 5) {
    score -= 10;
  } else if (summary.portfolio_yield < 7) {
    score -= 5;
  }

  // Deduct for high LTV
  if (summary.ltv_avg > 80) {
    score -= 15;
  } else if (summary.ltv_avg > 75) {
    score -= 10;
  }

  // Bonus for good DSCR
  if (summary.avg_dscr >= 1.5) {
    score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Get health score color
 */
export function getHealthScoreColor(score: number): 'success' | 'warning' | 'destructive' {
  if (score >= 80) return 'success';
  if (score >= 60) return 'warning';
  return 'destructive';
}
