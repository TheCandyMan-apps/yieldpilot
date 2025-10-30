/**
 * Multi-region location service
 * Routes queries to appropriate country-specific providers
 */

import * as uk from './providers/uk';
import * as us from './providers/us';
import * as es from './providers/es';

export type Location = uk.UKLocation | us.USLocation | es.ESLocation;

/**
 * Normalize a location query across all providers
 */
export function normalizeLocation(query: string): Location | null {
  // Try UK first (most common for this app historically)
  const ukResult = uk.normalizeQuery(query);
  if (ukResult) return ukResult;
  
  // Try US
  const usResult = us.normalizeQuery(query);
  if (usResult) return usResult;
  
  // Try ES
  const esResult = es.normalizeQuery(query);
  if (esResult) return esResult;
  
  return null;
}

/**
 * Check if a listing matches location criteria
 */
export function matchesLocation(listing: any, criteria: Location): boolean {
  switch (criteria.country) {
    case 'GB':
      return uk.isMatch(listing, criteria);
    case 'US':
      return us.isMatch(listing, criteria);
    case 'ES':
      return es.isMatch(listing, criteria);
    default:
      return false;
  }
}

/**
 * Calculate distance between two points
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  country: 'GB' | 'US' | 'ES' = 'GB'
): number {
  switch (country) {
    case 'GB':
    case 'ES':
      return uk.calculateDistance(lat1, lon1, lat2, lon2); // km
    case 'US':
      return us.calculateDistance(lat1, lon1, lat2, lon2); // miles
    default:
      return uk.calculateDistance(lat1, lon1, lat2, lon2);
  }
}

/**
 * Filter listings by radius
 */
export function filterByRadius(
  listings: any[],
  centerLat: number,
  centerLon: number,
  radiusKm: number,
  country: 'GB' | 'US' | 'ES' = 'GB'
): any[] {
  return listings.filter(listing => {
    if (!listing.location_lat || !listing.location_lng) return false;
    
    const distance = calculateDistance(
      centerLat,
      centerLon,
      listing.location_lat,
      listing.location_lng,
      country
    );
    
    // Convert miles to km for US
    const radius = country === 'US' ? radiusKm * 0.621371 : radiusKm;
    
    return distance <= radius;
  });
}
