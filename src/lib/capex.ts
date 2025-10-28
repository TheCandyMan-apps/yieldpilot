/**
 * CapEx (Capital Expenditure) Calculations
 * Handles renovation costs, lifecycle modeling, and impact on KPIs
 */

export interface CapExLine {
  item: string;
  category: 'structural' | 'mechanical' | 'cosmetic' | 'external' | 'other';
  unit_cost: number;
  qty: number;
  recurring: boolean;
  lifespan_years?: number;
  contingency_pct?: number;
}

export interface CapExTemplate {
  id?: string;
  user_id?: string;
  name: string;
  lines: CapExLine[];
}

export interface CapExImpact {
  total_upfront: number;
  total_with_contingency: number;
  annual_reserve: number;
  recurring_costs: CapExLine[];
  one_off_costs: CapExLine[];
  breakdown: Record<string, number>;
  payback_years?: number;
}

/**
 * Calculate total CapEx with contingency
 */
export function calculateCapExTotal(lines: CapExLine[]): number {
  return lines.reduce((sum, line) => {
    const lineCost = line.unit_cost * line.qty;
    const contingency = line.contingency_pct || 0;
    return sum + lineCost * (1 + contingency / 100);
  }, 0);
}

/**
 * Calculate annual reserve for recurring maintenance
 */
export function calculateAnnualReserve(lines: CapExLine[]): number {
  return lines
    .filter(line => line.recurring && line.lifespan_years)
    .reduce((sum, line) => {
      const lineCost = line.unit_cost * line.qty;
      const annualCost = lineCost / (line.lifespan_years || 1);
      return sum + annualCost;
    }, 0);
}

/**
 * Generate CapEx impact summary
 */
export function calculateCapExImpact(
  lines: CapExLine[],
  currentKPIs?: {
    cash_flow_monthly?: number;
    net_yield?: number;
    price?: number;
  }
): CapExImpact {
  const oneOffCosts = lines.filter(line => !line.recurring);
  const recurringCosts = lines.filter(line => line.recurring);

  const total_upfront = oneOffCosts.reduce(
    (sum, line) => sum + line.unit_cost * line.qty,
    0
  );

  const total_with_contingency = calculateCapExTotal(lines);
  const annual_reserve = calculateAnnualReserve(lines);

  // Breakdown by category
  const breakdown = lines.reduce((acc, line) => {
    const category = line.category;
    const lineCost = line.unit_cost * line.qty * (1 + (line.contingency_pct || 0) / 100);
    acc[category] = (acc[category] || 0) + lineCost;
    return acc;
  }, {} as Record<string, number>);

  // Calculate payback period if we have KPI data
  let payback_years: number | undefined;
  if (currentKPIs?.cash_flow_monthly && total_with_contingency > 0) {
    const monthly_cashflow_reduction = annual_reserve / 12;
    const adjusted_cashflow = (currentKPIs.cash_flow_monthly || 0) - monthly_cashflow_reduction;
    if (adjusted_cashflow > 0) {
      payback_years = total_with_contingency / (adjusted_cashflow * 12);
    }
  }

  return {
    total_upfront,
    total_with_contingency,
    annual_reserve,
    recurring_costs: recurringCosts,
    one_off_costs: oneOffCosts,
    breakdown,
    payback_years,
  };
}

/**
 * Apply CapEx impact to existing KPIs
 */
export function applyCapExToKPIs(
  kpis: any,
  capexImpact: CapExImpact,
  propertyPrice: number
): any {
  if (!kpis?.working) return kpis;

  const working = { ...kpis.working };

  // Increase total investment
  const additional_capital = capexImpact.total_with_contingency;
  working.total_investment = (working.total_investment || 0) + additional_capital;

  // Reduce monthly cashflow by amortized annual reserve
  const monthly_reserve = capexImpact.annual_reserve / 12;
  working.net_monthly_cashflow = (working.net_monthly_cashflow || 0) - monthly_reserve;
  working.annual_cashflow = working.net_monthly_cashflow * 12;

  // Recalculate yields
  if (working.total_investment > 0) {
    working.net_yield_pct = ((working.annual_cashflow || 0) / working.total_investment) * 100;
  }

  if (propertyPrice > 0) {
    working.gross_yield_pct = ((working.annual_rental_income || 0) / (propertyPrice + additional_capital)) * 100;
  }

  // Recalculate ROI
  if (working.total_investment > 0) {
    const annual_return = (working.annual_cashflow || 0) + ((working.property_appreciation || 0) / 25);
    working.roi_pct = (annual_return / working.total_investment) * 100;
  }

  // Update DSCR if mortgage data available
  if (working.monthly_mortgage && working.monthly_mortgage > 0) {
    const operating_income = (working.monthly_rental_income || 0) - (working.monthly_operating_costs || 0) - monthly_reserve;
    working.dscr = operating_income / working.monthly_mortgage;
  }

  return {
    ...kpis,
    working,
  };
}

/**
 * Common UK renovation templates
 */
export const UK_CAPEX_TEMPLATES: CapExTemplate[] = [
  {
    name: 'Light Refurb (Cosmetic)',
    lines: [
      { item: 'Painting & Decorating', category: 'cosmetic', unit_cost: 2500, qty: 1, recurring: true, lifespan_years: 5, contingency_pct: 10 },
      { item: 'Flooring (carpet/laminate)', category: 'cosmetic', unit_cost: 1500, qty: 1, recurring: true, lifespan_years: 8, contingency_pct: 10 },
      { item: 'Kitchen Refresh (doors/worktop)', category: 'cosmetic', unit_cost: 3000, qty: 1, recurring: false, contingency_pct: 15 },
      { item: 'Bathroom Refresh', category: 'cosmetic', unit_cost: 2000, qty: 1, recurring: false, contingency_pct: 15 },
    ],
  },
  {
    name: 'Medium Refurb',
    lines: [
      { item: 'Full Kitchen Replacement', category: 'mechanical', unit_cost: 8000, qty: 1, recurring: true, lifespan_years: 15, contingency_pct: 20 },
      { item: 'Full Bathroom Suite', category: 'mechanical', unit_cost: 5000, qty: 1, recurring: true, lifespan_years: 15, contingency_pct: 20 },
      { item: 'Boiler Replacement', category: 'mechanical', unit_cost: 2500, qty: 1, recurring: true, lifespan_years: 12, contingency_pct: 15 },
      { item: 'Windows (UPVC)', category: 'structural', unit_cost: 5000, qty: 1, recurring: true, lifespan_years: 20, contingency_pct: 15 },
      { item: 'Rewiring', category: 'mechanical', unit_cost: 4000, qty: 1, recurring: false, contingency_pct: 20 },
      { item: 'Painting & Decorating', category: 'cosmetic', unit_cost: 3500, qty: 1, recurring: true, lifespan_years: 5, contingency_pct: 10 },
    ],
  },
  {
    name: 'EPC Upgrade to C',
    lines: [
      { item: 'Cavity Wall Insulation', category: 'structural', unit_cost: 2000, qty: 1, recurring: false, contingency_pct: 15 },
      { item: 'Loft Insulation (270mm)', category: 'structural', unit_cost: 800, qty: 1, recurring: false, contingency_pct: 10 },
      { item: 'Condensing Boiler', category: 'mechanical', unit_cost: 2500, qty: 1, recurring: true, lifespan_years: 12, contingency_pct: 15 },
      { item: 'Double Glazing', category: 'structural', unit_cost: 5000, qty: 1, recurring: true, lifespan_years: 20, contingency_pct: 15 },
      { item: 'LED Lighting', category: 'mechanical', unit_cost: 400, qty: 1, recurring: false, contingency_pct: 5 },
      { item: 'Thermostatic Controls', category: 'mechanical', unit_cost: 600, qty: 1, recurring: false, contingency_pct: 10 },
    ],
  },
  {
    name: 'HMO Conversion (5 bed)',
    lines: [
      { item: 'Fire Doors', category: 'structural', unit_cost: 400, qty: 5, recurring: false, contingency_pct: 10 },
      { item: 'Fire Alarm System', category: 'mechanical', unit_cost: 1500, qty: 1, recurring: true, lifespan_years: 10, contingency_pct: 15 },
      { item: 'Emergency Lighting', category: 'mechanical', unit_cost: 800, qty: 1, recurring: true, lifespan_years: 10, contingency_pct: 10 },
      { item: 'Additional Bathrooms', category: 'structural', unit_cost: 6000, qty: 2, recurring: false, contingency_pct: 25 },
      { item: 'Kitchenette per room', category: 'mechanical', unit_cost: 1200, qty: 5, recurring: false, contingency_pct: 20 },
      { item: 'Locks & Security', category: 'other', unit_cost: 200, qty: 5, recurring: false, contingency_pct: 10 },
    ],
  },
];

/**
 * Format currency (GBP)
 */
export function formatCapExCurrency(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(value);
}
