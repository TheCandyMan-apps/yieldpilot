/**
 * Address normalization utilities
 */

export function normalizeAddress(address: string): string {
  if (!address) return '';

  let normalized = address.trim();

  // Remove "United Kingdom" suffix
  normalized = normalized.replace(/,?\s*United Kingdom\s*$/i, '');
  normalized = normalized.replace(/,?\s*UK\s*$/i, '');

  // Normalize common abbreviations
  const abbreviations: Record<string, string> = {
    'Rd\\.?': 'Road',
    'St\\.?': 'Street',
    'Ave\\.?': 'Avenue',
    'Dr\\.?': 'Drive',
    'Ln\\.?': 'Lane',
    'Ct\\.?': 'Court',
    'Pl\\.?': 'Place',
    'Sq\\.?': 'Square',
    'Ter\\.?': 'Terrace',
    'Gdns\\.?': 'Gardens',
    'Cres\\.?': 'Crescent',
    'Pk\\.?': 'Park',
  };

  for (const [abbr, full] of Object.entries(abbreviations)) {
    const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
    normalized = normalized.replace(regex, full);
  }

  // Remove extra spaces
  normalized = normalized.replace(/\s+/g, ' ');

  return normalized.trim();
}

export function extractPostcode(address: string): string | null {
  // UK postcode regex (simplified)
  const postcodeRegex = /\b([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})\b/i;
  const match = address.match(postcodeRegex);
  return match ? match[1].toUpperCase() : null;
}

export function generateCanonicalKey(
  postcode: string | null,
  houseNumber: string | null,
  bedrooms: number | null,
  priceKBand: number
): string {
  const parts = [
    postcode || 'UNKNOWN',
    houseNumber || 'NA',
    bedrooms || 0,
    Math.floor(priceKBand / 10) * 10, // Round to nearest 10k
  ];
  return parts.join('|');
}

export function extractHouseNumber(address: string): string | null {
  // Try to find house number at start
  const match = address.match(/^(\d+[A-Za-z]?)\s/);
  return match ? match[1] : null;
}

export function normalizeSiteName(site: string): 'zoopla' | 'rightmove' | 'unknown' {
  const s = site.toLowerCase().trim();
  if (s.includes('zoopla')) return 'zoopla';
  if (s.includes('rightmove') || s.includes('right move')) return 'rightmove';
  return 'unknown';
}
