import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

interface Assumptions {
  deposit_pct: number;
  apr: number;
  term_years: number;
  interest_only: boolean;
  voids_pct: number;
  maintenance_pct: number;
  management_pct: number;
  insurance_annual: number;
}

interface KPIs {
  purchase_price: number;
  deposit: number;
  loan_amount: number;
  monthly_rent: number;
  annual_rent: number;
  
  mortgage_payment_monthly: number;
  voids_cost_monthly: number;
  maintenance_cost_monthly: number;
  management_cost_monthly: number;
  insurance_cost_monthly: number;
  total_costs_monthly: number;
  
  gross_yield_pct: number;
  net_yield_pct: number;
  cashflow_monthly: number;
  cashflow_annual: number;
  roi_pct: number;
  dscr: number;
  
  working: {
    deposit: string;
    loan: string;
    mortgage: string;
    opex: string;
    gross_yield: string;
    net_yield: string;
    cashflow: string;
    roi: string;
    dscr: string;
  };
}

function calculateKPIs(price: number, rentMonthly: number, assumptions: Assumptions): KPIs {
  const deposit = price * (assumptions.deposit_pct / 100);
  const loan = price - deposit;
  
  let mortgageMonthly: number;
  if (assumptions.interest_only) {
    mortgageMonthly = (loan * assumptions.apr / 100) / 12;
  } else {
    const monthlyRate = assumptions.apr / 100 / 12;
    const numPayments = assumptions.term_years * 12;
    mortgageMonthly = loan * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                      (Math.pow(1 + monthlyRate, numPayments) - 1);
  }
  
  const annualRent = rentMonthly * 12;
  
  const voidsMonthly = rentMonthly * (assumptions.voids_pct / 100);
  const maintenanceMonthly = rentMonthly * (assumptions.maintenance_pct / 100);
  const managementMonthly = rentMonthly * (assumptions.management_pct / 100);
  const insuranceMonthly = assumptions.insurance_annual / 12;
  
  const totalCostsMonthly = mortgageMonthly + voidsMonthly + maintenanceMonthly + 
                            managementMonthly + insuranceMonthly;
  
  const grossYield = (annualRent / price) * 100;
  
  const netIncome = annualRent - (voidsMonthly + maintenanceMonthly + managementMonthly + insuranceMonthly) * 12;
  const netYield = ((netIncome - mortgageMonthly * 12) / price) * 100;
  
  const cashflowMonthly = rentMonthly - totalCostsMonthly;
  const cashflowAnnual = cashflowMonthly * 12;
  
  const roi = (cashflowAnnual / deposit) * 100;
  
  const noi = netIncome;
  const debtService = mortgageMonthly * 12;
  const dscr = debtService > 0 ? noi / debtService : 0;
  
  return {
    purchase_price: price,
    deposit,
    loan_amount: loan,
    monthly_rent: rentMonthly,
    annual_rent: annualRent,
    
    mortgage_payment_monthly: mortgageMonthly,
    voids_cost_monthly: voidsMonthly,
    maintenance_cost_monthly: maintenanceMonthly,
    management_cost_monthly: managementMonthly,
    insurance_cost_monthly: insuranceMonthly,
    total_costs_monthly: totalCostsMonthly,
    
    gross_yield_pct: grossYield,
    net_yield_pct: netYield,
    cashflow_monthly: cashflowMonthly,
    cashflow_annual: cashflowAnnual,
    roi_pct: roi,
    dscr,
    
    working: {
      deposit: `£${price.toLocaleString()} × ${assumptions.deposit_pct}% = £${deposit.toLocaleString()}`,
      loan: `£${price.toLocaleString()} - £${deposit.toLocaleString()} = £${loan.toLocaleString()}`,
      mortgage: assumptions.interest_only 
        ? `£${loan.toLocaleString()} × ${assumptions.apr}% ÷ 12 = £${mortgageMonthly.toFixed(2)}/mo`
        : `£${loan.toLocaleString()} @ ${assumptions.apr}% over ${assumptions.term_years}y = £${mortgageMonthly.toFixed(2)}/mo`,
      opex: `Voids ${assumptions.voids_pct}% + Maint ${assumptions.maintenance_pct}% + Mgmt ${assumptions.management_pct}% + Ins £${assumptions.insurance_annual}/yr`,
      gross_yield: `(£${annualRent.toLocaleString()} / £${price.toLocaleString()}) × 100 = ${grossYield.toFixed(2)}%`,
      net_yield: `((£${annualRent.toLocaleString()} - OpEx - Interest) / £${price.toLocaleString()}) × 100 = ${netYield.toFixed(2)}%`,
      cashflow: `£${rentMonthly.toLocaleString()} - £${totalCostsMonthly.toFixed(2)} = £${cashflowMonthly.toFixed(2)}/mo`,
      roi: `(£${cashflowAnnual.toFixed(2)} / £${deposit.toLocaleString()}) × 100 = ${roi.toFixed(2)}%`,
      dscr: `£${noi.toFixed(2)} NOI / £${debtService.toFixed(2)} debt = ${dscr.toFixed(2)}`,
    }
  };
}

// Test Scenarios
Deno.test("Scenario 1: Standard BTL (25% deposit, 5.5% APR, IO)", () => {
  const assumptions: Assumptions = {
    deposit_pct: 25,
    apr: 5.5,
    term_years: 25,
    interest_only: true,
    voids_pct: 5,
    maintenance_pct: 8,
    management_pct: 10,
    insurance_annual: 300,
  };

  const kpis = calculateKPIs(200000, 1000, assumptions);

  // Expected values (with small tolerance for floating point)
  assertEquals(kpis.deposit, 50000);
  assertEquals(kpis.loan_amount, 150000);
  assertEquals(Math.round(kpis.mortgage_payment_monthly), 688); // 150000 * 0.055 / 12 = 687.5
  assertEquals(kpis.annual_rent, 12000);
  assertEquals(Math.round(kpis.gross_yield_pct * 100), 600); // 6.00%
  assertEquals(Math.round(kpis.cashflow_monthly), 57); // ~57.50
  assertEquals(Math.round(kpis.roi_pct * 100), 138); // ~1.38%
  assertEquals(Math.round(kpis.dscr * 100), 96); // ~0.96
});

Deno.test("Scenario 2: HMO (20% deposit, 6.5% APR, IO, higher costs)", () => {
  const assumptions: Assumptions = {
    deposit_pct: 20,
    apr: 6.5,
    term_years: 25,
    interest_only: true,
    voids_pct: 8,
    maintenance_pct: 12,
    management_pct: 12,
    insurance_annual: 600,
  };

  const kpis = calculateKPIs(250000, 2000, assumptions);

  assertEquals(kpis.deposit, 50000);
  assertEquals(kpis.loan_amount, 200000);
  assertEquals(Math.round(kpis.mortgage_payment_monthly), 1083); // 200000 * 0.065 / 12
  assertEquals(kpis.annual_rent, 24000);
  assertEquals(Math.round(kpis.gross_yield_pct * 100), 960); // 9.60%
  assertEquals(Math.round(kpis.cashflow_monthly), 210); // ~210
  assertEquals(Math.round(kpis.roi_pct * 100), 504); // ~5.04%
  assertEquals(Math.round(kpis.dscr * 100), 131); // ~1.31
});

Deno.test("Scenario 3: Cash buyer (100% deposit, 0% APR, no mortgage)", () => {
  const assumptions: Assumptions = {
    deposit_pct: 100,
    apr: 0,
    term_years: 0,
    interest_only: true,
    voids_pct: 4,
    maintenance_pct: 6,
    management_pct: 0, // Self-managed
    insurance_annual: 250,
  };

  const kpis = calculateKPIs(150000, 800, assumptions);

  assertEquals(kpis.deposit, 150000);
  assertEquals(kpis.loan_amount, 0);
  assertEquals(kpis.mortgage_payment_monthly, 0);
  assertEquals(kpis.annual_rent, 9600);
  assertEquals(Math.round(kpis.gross_yield_pct * 100), 640); // 6.40%
  assertEquals(Math.round(kpis.cashflow_monthly), 699); // ~699
  assertEquals(Math.round(kpis.roi_pct * 100), 559); // ~5.59%
  assertEquals(kpis.dscr, 0); // No debt service
});

Deno.test("Verify yield calculations", () => {
  const assumptions: Assumptions = {
    deposit_pct: 25,
    apr: 5.0,
    term_years: 25,
    interest_only: true,
    voids_pct: 5,
    maintenance_pct: 8,
    management_pct: 10,
    insurance_annual: 300,
  };

  const kpis = calculateKPIs(100000, 500, assumptions);

  // Gross Yield = (Annual Rent / Price) * 100
  const expectedGrossYield = (6000 / 100000) * 100;
  assertEquals(kpis.gross_yield_pct, expectedGrossYield); // 6%

  // Net Yield calculation
  const annualOpex = (500 * 0.05 + 500 * 0.08 + 500 * 0.10) * 12 + 300;
  const annualMortgage = (75000 * 0.05 / 12) * 12;
  const netIncome = 6000 - annualOpex - annualMortgage;
  const expectedNetYield = (netIncome / 100000) * 100;
  assertEquals(Math.round(kpis.net_yield_pct * 100), Math.round(expectedNetYield * 100));
});

Deno.test("Verify DSCR calculation", () => {
  const assumptions: Assumptions = {
    deposit_pct: 25,
    apr: 5.0,
    term_years: 25,
    interest_only: true,
    voids_pct: 5,
    maintenance_pct: 8,
    management_pct: 10,
    insurance_annual: 300,
  };

  const kpis = calculateKPIs(200000, 1200, assumptions);

  // NOI = Annual Rent - Annual Operating Expenses (excluding mortgage)
  const annualRent = 1200 * 12;
  const annualOpex = (1200 * 0.05 + 1200 * 0.08 + 1200 * 0.10) * 12 + 300;
  const noi = annualRent - annualOpex;
  
  // Debt Service = Annual Mortgage Payments
  const debtService = (150000 * 0.05 / 12) * 12;
  
  // DSCR = NOI / Debt Service
  const expectedDSCR = noi / debtService;
  
  assertEquals(Math.round(kpis.dscr * 100), Math.round(expectedDSCR * 100));
  
  // DSCR should be > 1.0 for this scenario (good coverage)
  assertEquals(kpis.dscr > 1.0, true);
});
