/**
 * Spain Location Provider
 * Handles ES-specific location normalization and validation
 */

export interface ESLocation {
  country: 'ES';
  region: string; // Autonomous community
  city: string;
  postalCode?: string;
}

/**
 * Normalize Spain location query
 */
export function normalizeQuery(query: string): ESLocation | null {
  const cleaned = query.trim();
  
  // Spanish postal code pattern (5 digits)
  const postalCodeRegex = /^\d{5}$/;
  const postalCodeMatch = cleaned.match(postalCodeRegex);
  
  if (postalCodeMatch) {
    return {
      country: 'ES',
      region: getRegionFromPostalCode(postalCodeMatch[0]),
      city: '',
      postalCode: postalCodeMatch[0],
    };
  }
  
  // City names
  const cityMatch = ES_MAJOR_CITIES.find(city => 
    cleaned.toLowerCase().includes(city.name.toLowerCase())
  );
  
  if (cityMatch) {
    return {
      country: 'ES',
      region: cityMatch.region,
      city: cityMatch.name,
    };
  }
  
  return null;
}

/**
 * Check if a listing matches Spain location criteria
 */
export function isMatch(listing: any, criteria: ESLocation): boolean {
  if (listing.country !== 'ES') return false;
  
  if (criteria.postalCode && listing.postcode) {
    return listing.postcode.startsWith(criteria.postalCode.substring(0, 2));
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
 * Calculate distance between two coordinates
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

/**
 * Get region from postal code prefix
 */
function getRegionFromPostalCode(postalCode: string): string {
  const prefix = postalCode.substring(0, 2);
  
  const regionMap: Record<string, string> = {
    '01': 'País Vasco',
    '02': 'Castilla-La Mancha',
    '03': 'Comunidad Valenciana',
    '04': 'Andalucía',
    '05': 'Castilla y León',
    '06': 'Extremadura',
    '07': 'Islas Baleares',
    '08': 'Cataluña',
    '09': 'Castilla y León',
    '10': 'Extremadura',
    '11': 'Andalucía',
    '12': 'Comunidad Valenciana',
    '13': 'Castilla-La Mancha',
    '14': 'Andalucía',
    '15': 'Galicia',
    '16': 'Castilla-La Mancha',
    '17': 'Cataluña',
    '18': 'Andalucía',
    '19': 'Castilla-La Mancha',
    '20': 'País Vasco',
    '21': 'Andalucía',
    '22': 'Aragón',
    '23': 'Andalucía',
    '24': 'Castilla y León',
    '25': 'Cataluña',
    '26': 'La Rioja',
    '27': 'Galicia',
    '28': 'Madrid',
    '29': 'Andalucía',
    '30': 'Murcia',
    '31': 'Navarra',
    '32': 'Galicia',
    '33': 'Asturias',
    '34': 'Castilla y León',
    '35': 'Canarias',
    '36': 'Galicia',
    '37': 'Castilla y León',
    '38': 'Canarias',
    '39': 'Cantabria',
    '40': 'Castilla y León',
    '41': 'Andalucía',
    '42': 'Castilla y León',
    '43': 'Cataluña',
    '44': 'Aragón',
    '45': 'Castilla-La Mancha',
    '46': 'Comunidad Valenciana',
    '47': 'Castilla y León',
    '48': 'País Vasco',
    '49': 'Castilla y León',
    '50': 'Aragón',
    '51': 'Ceuta',
    '52': 'Melilla',
  };
  
  return regionMap[prefix] || 'España';
}

// Major Spanish cities
const ES_MAJOR_CITIES = [
  { name: 'Madrid', region: 'Madrid' },
  { name: 'Barcelona', region: 'Cataluña' },
  { name: 'Valencia', region: 'Comunidad Valenciana' },
  { name: 'Sevilla', region: 'Andalucía' },
  { name: 'Zaragoza', region: 'Aragón' },
  { name: 'Málaga', region: 'Andalucía' },
  { name: 'Murcia', region: 'Murcia' },
  { name: 'Palma', region: 'Islas Baleares' },
  { name: 'Las Palmas', region: 'Canarias' },
  { name: 'Bilbao', region: 'País Vasco' },
  { name: 'Alicante', region: 'Comunidad Valenciana' },
  { name: 'Córdoba', region: 'Andalucía' },
  { name: 'Valladolid', region: 'Castilla y León' },
  { name: 'Vigo', region: 'Galicia' },
  { name: 'Gijón', region: 'Asturias' },
  { name: 'Granada', region: 'Andalucía' },
  { name: 'Marbella', region: 'Andalucía' },
  { name: 'Santander', region: 'Cantabria' },
  { name: 'Pamplona', region: 'Navarra' },
  { name: 'San Sebastián', region: 'País Vasco' },
];
