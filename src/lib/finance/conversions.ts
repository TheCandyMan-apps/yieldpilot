// Currency Conversion & Localization Utilities

interface FXRate {
  base: string;
  target: string;
  rate: number;
  fetched_at: string;
}

const FALLBACK_RATES: Record<string, number> = {
  'GBP_USD': 1.27,
  'GBP_EUR': 1.17,
  'USD_GBP': 0.79,
  'USD_EUR': 0.92,
  'EUR_GBP': 0.85,
  'EUR_USD': 1.08,
};

export async function convertCurrency(
  amount: number,
  from: string,
  to: string,
  fxRates?: FXRate[]
): Promise<number> {
  if (from === to) return amount;

  // Try to use provided rates first
  if (fxRates) {
    const rate = fxRates.find(r => r.base === from && r.target === to);
    if (rate) return amount * rate.rate;
  }

  // Fallback to hardcoded rates
  const key = `${from}_${to}`;
  const rate = FALLBACK_RATES[key];
  if (rate) return amount * rate;

  // If no rate found, return original amount
  console.warn(`No FX rate found for ${from} -> ${to}`);
  return amount;
}

export function formatCurrencyLocalized(
  amount: number,
  currency: string,
  locale: string = 'en-GB'
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch (error) {
    // Fallback
    const symbols: Record<string, string> = {
      GBP: '£',
      USD: '$',
      EUR: '€',
    };
    return `${symbols[currency] || currency}${amount.toLocaleString()}`;
  }
}

export function formatMultiCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rate: number,
  locale: string = 'en-GB'
): string {
  const converted = amount * rate;
  const from = formatCurrencyLocalized(amount, fromCurrency, locale);
  const to = formatCurrencyLocalized(converted, toCurrency, locale);
  return `${from} ≈ ${to}`;
}

export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    GBP: '£',
    USD: '$',
    EUR: '€',
    CAD: 'C$',
    AUD: 'A$',
  };
  return symbols[currency] || currency;
}
