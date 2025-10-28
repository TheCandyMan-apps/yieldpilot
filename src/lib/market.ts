// Market configuration per country

export type MarketId = 'GB' | 'US' | 'DE' | 'ES' | 'FR';

export interface MarketConfig {
  id: MarketId;
  name: string;
  currency: 'GBP' | 'USD' | 'EUR';
  locale: string;
  flag: string;
  defaultAssumptions: {
    interestRateAPR: number;
    mortgageLTV: number;
    maintenancePct: number;
    voidsPct: number;
    managementPct: number;
    insurancePm: number;
    epcMin?: string; // GB-specific
    propTaxPct?: number; // US-specific
    hoaPm?: number; // US condos
    notaryPct?: number; // EU-specific
    stampDutyPct?: number; // GB-specific
  };
}

export const MARKETS: Record<MarketId, MarketConfig> = {
  GB: {
    id: 'GB',
    name: 'United Kingdom',
    currency: 'GBP',
    locale: 'en-GB',
    flag: '🇬🇧',
    defaultAssumptions: {
      interestRateAPR: 5.5,
      mortgageLTV: 75,
      maintenancePct: 8,
      voidsPct: 5,
      managementPct: 10,
      insurancePm: 25,
      epcMin: 'C',
      stampDutyPct: 3,
    },
  },
  US: {
    id: 'US',
    name: 'United States',
    currency: 'USD',
    locale: 'en-US',
    flag: '🇺🇸',
    defaultAssumptions: {
      interestRateAPR: 7.0,
      mortgageLTV: 80,
      maintenancePct: 10,
      voidsPct: 5,
      managementPct: 10,
      insurancePm: 100,
      propTaxPct: 1.2,
      hoaPm: 200,
    },
  },
  DE: {
    id: 'DE',
    name: 'Germany',
    currency: 'EUR',
    locale: 'de-DE',
    flag: '🇩🇪',
    defaultAssumptions: {
      interestRateAPR: 4.5,
      mortgageLTV: 70,
      maintenancePct: 12,
      voidsPct: 5,
      managementPct: 10,
      insurancePm: 30,
      notaryPct: 2,
    },
  },
  ES: {
    id: 'ES',
    name: 'Spain',
    currency: 'EUR',
    locale: 'es-ES',
    flag: '🇪🇸',
    defaultAssumptions: {
      interestRateAPR: 4.0,
      mortgageLTV: 70,
      maintenancePct: 10,
      voidsPct: 8,
      managementPct: 10,
      insurancePm: 25,
      notaryPct: 1.5,
    },
  },
  FR: {
    id: 'FR',
    name: 'France',
    currency: 'EUR',
    locale: 'fr-FR',
    flag: '🇫🇷',
    defaultAssumptions: {
      interestRateAPR: 4.2,
      mortgageLTV: 70,
      maintenancePct: 10,
      voidsPct: 6,
      managementPct: 10,
      insurancePm: 35,
      notaryPct: 2.5,
    },
  },
};

export function getMarket(id: MarketId): MarketConfig {
  return MARKETS[id];
}

export function getMarketFromCountryCode(countryCode: string): MarketConfig {
  const id = countryCode.toUpperCase() as MarketId;
  return MARKETS[id] || MARKETS.GB;
}

export function detectMarketFromUrl(url: string): MarketId {
  const urlLower = url.toLowerCase();
  
  // UK sites
  if (urlLower.includes('zoopla.co.uk') || urlLower.includes('rightmove.co.uk')) {
    return 'GB';
  }
  
  // US sites
  if (urlLower.includes('zillow.com') || urlLower.includes('realtor.com') || urlLower.includes('redfin.com')) {
    return 'US';
  }
  
  // German sites
  if (urlLower.includes('immobilienscout24.de') || urlLower.includes('immowelt.de')) {
    return 'DE';
  }
  
  // Spanish sites
  if (urlLower.includes('idealista.com')) {
    return 'ES';
  }
  
  // French sites
  if (urlLower.includes('seloger.com') || urlLower.includes('leboncoin.fr')) {
    return 'FR';
  }
  
  return 'GB'; // Default
}
