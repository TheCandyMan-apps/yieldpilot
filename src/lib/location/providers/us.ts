/**
 * US Location Provider
 * Handles US-specific location normalization and validation
 */

export interface USLocation {
  country: 'US';
  region: string; // State code (CA, NY, TX, etc.)
  city: string;
  zipCode?: string;
}

/**
 * Normalize US location query
 */
export function normalizeQuery(query: string): USLocation | null {
  const cleaned = query.trim();
  
  // US ZIP code pattern (5 or 9 digits)
  const zipRegex = /^\d{5}(-\d{4})?$/;
  const zipMatch = cleaned.match(zipRegex);
  
  if (zipMatch) {
    return {
      country: 'US',
      region: '', // Would need ZIP to state lookup
      city: '',
      zipCode: zipMatch[0],
    };
  }
  
  // State codes
  const stateMatch = cleaned.match(/\b([A-Z]{2})\b/);
  if (stateMatch && US_STATES[stateMatch[1]]) {
    return {
      country: 'US',
      region: stateMatch[1],
      city: '',
    };
  }
  
  // City names
  const cityMatch = US_MAJOR_CITIES.find(city => 
    cleaned.toLowerCase().includes(city.name.toLowerCase())
  );
  
  if (cityMatch) {
    return {
      country: 'US',
      region: cityMatch.state,
      city: cityMatch.name,
    };
  }
  
  return null;
}

/**
 * Check if a listing matches US location criteria
 */
export function isMatch(listing: any, criteria: USLocation): boolean {
  if (listing.country !== 'US') return false;
  
  if (criteria.zipCode && listing.postcode) {
    return listing.postcode.startsWith(criteria.zipCode.substring(0, 5));
  }
  
  if (criteria.city) {
    return listing.city?.toLowerCase().includes(criteria.city.toLowerCase());
  }
  
  if (criteria.region) {
    return listing.region?.toUpperCase() === criteria.region.toUpperCase();
  }
  
  return false;
}

/**
 * Calculate distance between two coordinates (same as UK)
 */
export function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 3959; // Earth radius in miles for US
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// US State codes
const US_STATES: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
  'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
  'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
  'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
  'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
  'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
  'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
  'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
  'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
  'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
  'WI': 'Wisconsin', 'WY': 'Wyoming'
};

// Major US cities
const US_MAJOR_CITIES = [
  { name: 'New York', state: 'NY' },
  { name: 'Los Angeles', state: 'CA' },
  { name: 'Chicago', state: 'IL' },
  { name: 'Houston', state: 'TX' },
  { name: 'Phoenix', state: 'AZ' },
  { name: 'Philadelphia', state: 'PA' },
  { name: 'San Antonio', state: 'TX' },
  { name: 'San Diego', state: 'CA' },
  { name: 'Dallas', state: 'TX' },
  { name: 'Austin', state: 'TX' },
  { name: 'Jacksonville', state: 'FL' },
  { name: 'Fort Worth', state: 'TX' },
  { name: 'Columbus', state: 'OH' },
  { name: 'Charlotte', state: 'NC' },
  { name: 'San Francisco', state: 'CA' },
  { name: 'Indianapolis', state: 'IN' },
  { name: 'Seattle', state: 'WA' },
  { name: 'Denver', state: 'CO' },
  { name: 'Boston', state: 'MA' },
  { name: 'Nashville', state: 'TN' },
  { name: 'Miami', state: 'FL' },
  { name: 'Atlanta', state: 'GA' },
  { name: 'Las Vegas', state: 'NV' },
  { name: 'Portland', state: 'OR' },
];
