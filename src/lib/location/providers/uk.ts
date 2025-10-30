/**
 * UK Location Provider
 * Handles UK-specific location normalization and validation
 */

export interface UKLocation {
  country: 'GB';
  region: string;
  city: string;
  postcode?: string;
}

/**
 * Normalize UK location query
 */
export function normalizeQuery(query: string): UKLocation | null {
  const cleaned = query.trim();
  
  // UK postcode patterns
  const postcodeRegex = /^([A-Z]{1,2}\d{1,2}[A-Z]?)\s*(\d[A-Z]{2})?$/i;
  const postcodeMatch = cleaned.match(postcodeRegex);
  
  if (postcodeMatch) {
    return {
      country: 'GB',
      region: getRegionFromPostcode(postcodeMatch[1]),
      city: '',
      postcode: postcodeMatch[0].toUpperCase(),
    };
  }
  
  // City names
  const ukCities = [
    'London', 'Birmingham', 'Manchester', 'Leeds', 'Liverpool', 
    'Newcastle', 'Sheffield', 'Bristol', 'Glasgow', 'Edinburgh',
    'Cardiff', 'Belfast', 'Southampton', 'Brighton', 'Nottingham',
    'Leicester', 'Coventry', 'Bradford', 'Stoke', 'Wolverhampton'
  ];
  
  const cityMatch = ukCities.find(city => 
    cleaned.toLowerCase().includes(city.toLowerCase())
  );
  
  if (cityMatch) {
    return {
      country: 'GB',
      region: getRegionFromCity(cityMatch),
      city: cityMatch,
    };
  }
  
  return null;
}

/**
 * Check if a listing matches UK location criteria
 */
export function isMatch(listing: any, criteria: UKLocation): boolean {
  if (listing.country !== 'GB') return false;
  
  if (criteria.postcode && listing.postcode) {
    return listing.postcode.toUpperCase().startsWith(criteria.postcode.toUpperCase());
  }
  
  if (criteria.city) {
    return listing.city?.toLowerCase().includes(criteria.city.toLowerCase());
  }
  
  if (criteria.region) {
    return listing.region?.toLowerCase() === criteria.region.toLowerCase();
  }
  
  return false;
}

/**
 * Get region from postcode area
 */
function getRegionFromPostcode(outcode: string): string {
  const areaCode = outcode.match(/^[A-Z]+/)?.[0] || '';
  
  const regionMap: Record<string, string> = {
    'E': 'London',
    'EC': 'London',
    'N': 'London',
    'NW': 'London',
    'SE': 'London',
    'SW': 'London',
    'W': 'London',
    'WC': 'London',
    'B': 'West Midlands',
    'M': 'Greater Manchester',
    'LS': 'Yorkshire',
    'L': 'Merseyside',
    'NE': 'Tyne and Wear',
    'S': 'South Yorkshire',
    'BS': 'Bristol',
    'G': 'Glasgow',
    'EH': 'Edinburgh',
    'CF': 'Cardiff',
    'BT': 'Belfast',
  };
  
  return regionMap[areaCode] || 'England';
}

/**
 * Get region from city name
 */
function getRegionFromCity(city: string): string {
  const cityMap: Record<string, string> = {
    'London': 'London',
    'Birmingham': 'West Midlands',
    'Manchester': 'Greater Manchester',
    'Leeds': 'Yorkshire',
    'Liverpool': 'Merseyside',
    'Newcastle': 'Tyne and Wear',
    'Sheffield': 'South Yorkshire',
    'Bristol': 'Bristol',
    'Glasgow': 'Scotland',
    'Edinburgh': 'Scotland',
    'Cardiff': 'Wales',
    'Belfast': 'Northern Ireland',
  };
  
  return cityMap[city] || 'England';
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
