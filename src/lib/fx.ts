// FX service with Supabase caching

import { supabase } from '@/integrations/supabase/client';
import { logger } from './log';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface FXRate {
  base: string;
  target: string;
  rate: number;
  fetched_at: string;
}

// In-memory cache
const rateCache = new Map<string, { rate: number; timestamp: number }>();

function getCacheKey(from: string, to: string): string {
  return `${from}_${to}`;
}

// Get rate from cache (memory + Supabase)
async function getCachedRate(from: string, to: string): Promise<number | null> {
  const cacheKey = getCacheKey(from, to);
  
  // Check memory cache first
  const cached = rateCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.rate;
  }

  // Check Supabase cache
  try {
    const { data, error } = await supabase
      .from('fx_rates')
      .select('rate, fetched_at')
      .eq('base', from)
      .eq('target', to)
      .single();

    if (!error && data) {
      const age = Date.now() - new Date(data.fetched_at).getTime();
      if (age < CACHE_TTL_MS) {
        // Update memory cache
        rateCache.set(cacheKey, { rate: data.rate, timestamp: Date.now() });
        return data.rate;
      }
    }
  } catch (error) {
    logger.warn('Failed to fetch cached FX rate from Supabase', { from, to });
  }

  return null;
}

// Fetch fresh rate from external API
async function fetchFreshRate(from: string, to: string): Promise<number> {
  // Using exchangerate-api.com (free tier)
  const apiUrl = `https://api.exchangerate-api.com/v4/latest/${from}`;
  
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const rate = data.rates[to];
    
    if (!rate) {
      throw new Error(`Rate not found for ${from} -> ${to}`);
    }

    // Cache in both memory and Supabase
    rateCache.set(getCacheKey(from, to), { rate, timestamp: Date.now() });
    
    await supabase.from('fx_rates').upsert({
      base: from,
      target: to,
      rate,
      fetched_at: new Date().toISOString(),
    });

    logger.info('Fetched fresh FX rate', { from, to, rate });
    return rate;

  } catch (error: any) {
    logger.error('Failed to fetch fresh FX rate', { from, to, error: error.message });
    throw error;
  }
}

// Main conversion function
export async function convertCurrency(
  amount: number,
  from: string,
  to: string
): Promise<number> {
  if (from === to) return amount;

  try {
    // Try cache first
    let rate = await getCachedRate(from, to);
    
    // If not cached, fetch fresh
    if (rate === null) {
      rate = await fetchFreshRate(from, to);
    }

    return amount * rate;

  } catch (error) {
    logger.error('Currency conversion failed', { amount, from, to });
    // Fallback: return original amount
    return amount;
  }
}

// Get exchange rate without conversion
export async function getExchangeRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;

  try {
    let rate = await getCachedRate(from, to);
    if (rate === null) {
      rate = await fetchFreshRate(from, to);
    }
    return rate;
  } catch (error) {
    logger.error('Failed to get exchange rate', { from, to });
    return 1; // Fallback
  }
}

// Format currency with localization
export function formatCurrency(
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
