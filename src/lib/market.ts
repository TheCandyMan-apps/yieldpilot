// Market configuration per country

export type MarketId = 'GB' | 'US' | 'DE' | 'ES' | 'FR' | 'ZA' | 'TR' | 'AE' | 'PT' | 'AU' | 'CA';

export interface MarketConfig {
  id: MarketId;
  name: string;
  currency: 'GBP' | 'USD' | 'EUR' | 'ZAR' | 'TRY' | 'AED' | 'AUD' | 'CAD';
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
    transferDutyPct?: number; // ZA/AU-specific
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
  ZA: {
    id: 'ZA',
    name: 'South Africa',
    currency: 'ZAR',
    locale: 'en-ZA',
    flag: '🇿🇦',
    defaultAssumptions: {
      interestRateAPR: 11.5,
      mortgageLTV: 80,
      maintenancePct: 12,
      voidsPct: 8,
      managementPct: 10,
      insurancePm: 150,
      transferDutyPct: 3,
    },
  },
  TR: {
    id: 'TR',
    name: 'Turkey',
    currency: 'TRY',
    locale: 'tr-TR',
    flag: '🇹🇷',
    defaultAssumptions: {
      interestRateAPR: 45.0,
      mortgageLTV: 70,
      maintenancePct: 10,
      voidsPct: 7,
      managementPct: 8,
      insurancePm: 100,
      notaryPct: 4,
    },
  },
  AE: {
    id: 'AE',
    name: 'United Arab Emirates',
    currency: 'AED',
    locale: 'en-AE',
    flag: '🇦🇪',
    defaultAssumptions: {
      interestRateAPR: 5.5,
      mortgageLTV: 75,
      maintenancePct: 8,
      voidsPct: 6,
      managementPct: 5,
      insurancePm: 80,
      transferDutyPct: 4,
    },
  },
  PT: {
    id: 'PT',
    name: 'Portugal',
    currency: 'EUR',
    locale: 'pt-PT',
    flag: '🇵🇹',
    defaultAssumptions: {
      interestRateAPR: 4.8,
      mortgageLTV: 80,
      maintenancePct: 10,
      voidsPct: 7,
      managementPct: 10,
      insurancePm: 30,
      notaryPct: 2,
      stampDutyPct: 6.5,
    },
  },
  AU: {
    id: 'AU',
    name: 'Australia',
    currency: 'AUD',
    locale: 'en-AU',
    flag: '🇦🇺',
    defaultAssumptions: {
      interestRateAPR: 6.5,
      mortgageLTV: 80,
      maintenancePct: 10,
      voidsPct: 5,
      managementPct: 8,
      insurancePm: 120,
      transferDutyPct: 4.5,
    },
  },
  CA: {
    id: 'CA',
    name: 'Canada',
    currency: 'CAD',
    locale: 'en-CA',
    flag: '🇨🇦',
    defaultAssumptions: {
      interestRateAPR: 6.8,
      mortgageLTV: 80,
      maintenancePct: 10,
      voidsPct: 5,
      managementPct: 10,
      insurancePm: 150,
      propTaxPct: 1.0,
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
  
  // South African sites
  if (urlLower.includes('property24.com') || urlLower.includes('privateproperty.co.za')) {
    return 'ZA';
  }
  
  // Turkish sites
  if (urlLower.includes('hepsiemlak.com') || urlLower.includes('sahibinden.com')) {
    return 'TR';
  }
  
  // UAE sites
  if (urlLower.includes('bayut.com') || urlLower.includes('propertyfinder.ae') || urlLower.includes('dubizzle.com')) {
    return 'AE';
  }
  
  // Portuguese sites
  if (urlLower.includes('idealista.pt') || urlLower.includes('imovirtual.com')) {
    return 'PT';
  }
  
  // Australian sites
  if (urlLower.includes('domain.com.au') || urlLower.includes('realestate.com.au')) {
    return 'AU';
  }
  
  // Canadian sites
  if (urlLower.includes('realtor.ca') || urlLower.includes('remax.ca')) {
    return 'CA';
  }
  
  return 'GB'; // Default fallback
}
