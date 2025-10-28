// Regional Finance Normalization

import { RegionalConfig } from '../sources/types';

export interface RegionalYieldParams {
  propertyPrice: number;
  annualRent: number;
  mortgageInterest: number;
  region: RegionalConfig;
}

export function calculateRegionalNetYield(params: RegionalYieldParams): {
  grossYield: number;
  netYield: number;
  breakdown: Record<string, number>;
} {
  const { propertyPrice, annualRent, mortgageInterest, region } = params;

  // Calculate costs
  const propertyTax = propertyPrice * (region.taxRate / 100);
  const maintenance = propertyPrice * (region.maintenanceRate / 100);
  const insurance = propertyPrice * (region.insuranceRate / 100);
  const totalCosts = propertyTax + maintenance + insurance;

  // Mortgage interest deduction
  const taxDeduction = region.mortgageDeductible ? mortgageInterest * 0.25 : 0; // Simplified

  // Gross yield
  const grossYield = (annualRent / propertyPrice) * 100;

  // Net yield
  const netIncome = annualRent - totalCosts - mortgageInterest + taxDeduction;
  const netYield = (netIncome / propertyPrice) * 100;

  return {
    grossYield,
    netYield,
    breakdown: {
      annualRent,
      propertyTax,
      maintenance,
      insurance,
      mortgageInterest,
      taxDeduction,
      totalCosts,
      netIncome,
    },
  };
}

export function calculateStampDuty(price: number, region: string, stampDutyRates: any[]): number {
  if (region !== 'UK' || !stampDutyRates?.length) return 0;

  let duty = 0;
  let previousThreshold = 0;

  for (const bracket of stampDutyRates) {
    if (price > bracket.threshold) {
      const taxableAmount = Math.min(price, bracket.threshold + 999999) - previousThreshold;
      duty += taxableAmount * (bracket.rate / 100);
      previousThreshold = bracket.threshold;
    } else {
      break;
    }
  }

  return duty;
}

export function calculateClosingCosts(price: number, region: RegionalConfig): number {
  return price * (region.closingCostsPct / 100);
}

export function normalizeToBaseCurrency(
  value: number,
  fromCurrency: string,
  toCurrency: string,
  fxRate: number = 1
): number {
  if (fromCurrency === toCurrency) return value;
  return value * fxRate;
}

// Regional default assumptions
export const REGIONAL_DEFAULTS: Record<string, Partial<RegionalConfig>> = {
  UK: {
    region: 'UK',
    currency: 'GBP',
    locale: 'en-GB',
    taxRate: 0.9,
    maintenanceRate: 1.0,
    insuranceRate: 0.4,
    mortgageDeductible: false,
    closingCostsPct: 1.5,
  },
  US: {
    region: 'US',
    currency: 'USD',
    locale: 'en-US',
    taxRate: 1.5,
    maintenanceRate: 0.8,
    insuranceRate: 0.5,
    mortgageDeductible: true,
    closingCostsPct: 2.5,
  },
  DE: {
    region: 'DE',
    currency: 'EUR',
    locale: 'de-DE',
    taxRate: 1.0,
    maintenanceRate: 1.2,
    insuranceRate: 0.3,
    mortgageDeductible: false,
    closingCostsPct: 8.5,
  },
  FR: {
    region: 'FR',
    currency: 'EUR',
    locale: 'fr-FR',
    taxRate: 1.2,
    maintenanceRate: 1.0,
    insuranceRate: 0.3,
    mortgageDeductible: false,
    closingCostsPct: 7.5,
  },
  ES: {
    region: 'ES',
    currency: 'EUR',
    locale: 'es-ES',
    taxRate: 0.8,
    maintenanceRate: 1.0,
    insuranceRate: 0.3,
    mortgageDeductible: false,
    closingCostsPct: 10.0,
  },
};
