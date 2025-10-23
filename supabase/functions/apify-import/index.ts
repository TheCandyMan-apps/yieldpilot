// Using Deno.serve to run an importer that polls Apify and inserts items into deals_feed
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const APIFY_API_KEY = Deno.env.get('APIFY_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!APIFY_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required server configuration');
    }

    const { runId, datasetId, source, location } = await req.json();
    if (!runId || !source) throw new Error('runId and source are required');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Poll Apify until the run succeeds (even if datasetId is already known)
    let effectiveDatasetId: string | undefined = datasetId;
    for (let i = 0; i < 40; i++) { // ~200s
      const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
        headers: { Authorization: `Bearer ${APIFY_API_KEY}` },
      });
      const statusJson = await statusRes.json();
      const status = statusJson.data?.status;
      effectiveDatasetId = statusJson.data?.defaultDatasetId || effectiveDatasetId;
      if (status === 'SUCCEEDED') break;
      await new Promise((r) => setTimeout(r, 5000));
    }

    if (!effectiveDatasetId) {
      return new Response(JSON.stringify({ imported: 0, message: 'No dataset id after polling' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch dataset items
    const dsRes = await fetch(`https://api.apify.com/v2/datasets/${effectiveDatasetId}/items?format=json`, {
      headers: { Authorization: `Bearer ${APIFY_API_KEY}` },
    });
    if (!dsRes.ok) throw new Error('Failed to fetch dataset items');
    const items: any[] = await dsRes.json();

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ imported: 0, message: 'No items in dataset' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Helper: robust UK location matching (city/town or postcode outward)
    const countyPostcodePrefixes: Record<string, string[]> = {
      surrey: ['gu', 'kt', 'rh', 'sm', 'tw', 'cr'],
      manchester: ['m', 'wa', 'sk'],
      london: ['ec', 'wc', 'nw', 'sw', 'se', 'w', 'n', 'e', 'tw', 'cr', 'sm', 'br', 'ig', 'rm', 'ha', 'ub', 'en', 'da', 'kt'],
    };
    const countyTowns: Record<string, string[]> = {
      surrey: [
        'guildford','woking','epsom','ewell','reigate','redhill','weybridge','walton-on-thames','walton on thames',
        'camberley','farnham','dorking','leatherhead','staines','staines-upon-thames','chertsey','egham','godalming',
        'haslemere','esher','cobham','banstead','caterham','addlestone','sunbury','shepperton','frimley','bagshot'
      ],
    };
    const norm = (s: any) => (s ? String(s).toLowerCase() : '');
    const normalizePc = (pc: string | undefined) => norm(pc).replace(/\s|[^a-z0-9]/g, '');
    const outward = (pc: string) => pc.replace(/([0-9][a-z]{2})$/i, '');
    const isPostcodeLike = (s: string) => /^[a-z]{1,2}\d[a-z\d]?/i.test(s);

    const matchesRequestedLocation = (raw: any): boolean => {
      if (!location) return true;
      const addr = norm(raw.address?.displayAddress || raw.propertyAddress || raw.address || raw.displayAddress || raw.title);
      const city = norm(raw.address?.town || raw.address?.city || raw.city || raw.county || raw.location);
      const rawPc = raw.address?.postcode || raw.postcode || raw.outcode;
      const pc = normalizePc(rawPc);
      const target = norm(location).replace(/[^a-z0-9]/g, '');

      // Direct matches against text
      if (addr.includes(target) || city.includes(target)) return true;

      // Postcode outward matching (e.g., GU1, KT12, SW1A)
      if (isPostcodeLike(target)) {
        const targetOut = outward(target);
        if (pc && outward(pc).startsWith(targetOut)) return true;
        // Also check if target outward has known towns
        const townsForOutward = outwardTowns[target];
        if (townsForOutward && townsForOutward.some((t) => addr.includes(t) || city.includes(t))) return true;
        // Fallback: match outward string in address text
        if (addr.includes(targetOut) || city.includes(targetOut)) return true;
      }

      // County-level matching via postcode prefixes
      const prefixes = countyPostcodePrefixes[target];
      if (prefixes && pc && prefixes.some((p) => pc.startsWith(p))) return true;

      // County-level matching via known towns
      const townsForTarget = countyTowns[target] || [];
      if (townsForTarget.some((t) => addr.includes(t) || city.includes(t))) return true;

      // If searching by a town name, infer its county and match
      for (const [county, towns] of Object.entries(countyTowns)) {
        if (towns.includes(target)) {
          if (addr.includes(target) || city.includes(target)) return true;
          const pref = countyPostcodePrefixes[county];
          if (pref && pc && pref.some((p) => pc.startsWith(p))) return true;
        }
      }

      return false;
    };

    const mapRightmove = (prop: any) => {
      const address = prop.address?.displayAddress || prop.propertyAddress || 'Unknown Address';
      // Remove user's location from fallback - only use scraped fields
      const extractedCity = extractCityFromAddress(address, prop.address?.town, prop.address?.city);
      return {
        property_address: address,
        postcode: prop.address?.postcode || null,
        city: extractedCity,
        property_type: mapPropertyType(prop.propertySubType || prop.propertyType),
        price: parsePrice(prop.price?.amount || prop.price),
        estimated_rent: estimateRent(parsePrice(prop.price?.amount || prop.price)),
        bedrooms: parseInt(prop.bedrooms) || null,
        bathrooms: parseInt(prop.bathrooms) || null,
        square_feet: prop.size?.max ? parseInt(prop.size.max) : null,
        image_url: prop.propertyImages?.[0] || prop.images?.[0] || null,
        listing_url: prop.propertyUrl || prop.url || null,
        location_lat: prop.location?.latitude ? parseFloat(prop.location.latitude) : null,
        location_lng: prop.location?.longitude ? parseFloat(prop.location.longitude) : null,
        source: 'apify-rightmove',
        is_active: true,
        yield_percentage: calculateYield(parsePrice(prop.price?.amount || prop.price), estimateRent(parsePrice(prop.price?.amount || prop.price))),
        roi_percentage: calculateROI(parsePrice(prop.price?.amount || prop.price)),
        cash_flow_monthly: calculateCashFlow(parsePrice(prop.price?.amount || prop.price), estimateRent(parsePrice(prop.price?.amount || prop.price))),
        investment_score: calculateScore(parsePrice(prop.price?.amount || prop.price)),
      };
    };

    const mapZoopla = (prop: any) => {
      const address = prop.address || prop.displayAddress || prop.title || 'Unknown Address';
      // Remove user's location from fallback - only use scraped fields
      const extractedCity = extractCityFromAddress(address, prop.city, prop.county);
      return {
        property_address: address,
        postcode: prop.postcode || null,
        city: extractedCity,
        property_type: mapPropertyType(prop.propertyType),
        price: parsePrice(prop.price),
        estimated_rent: estimateRent(parsePrice(prop.price)),
        bedrooms: parseInt(prop.bedrooms) || null,
        bathrooms: parseInt(prop.bathrooms) || null,
        square_feet: null,
        image_url: prop.image || prop.images?.[0] || null,
        listing_url: prop.url || null,
        location_lat: prop.latitude ? parseFloat(prop.latitude) : null,
        location_lng: prop.longitude ? parseFloat(prop.longitude) : null,
        source: 'apify-zoopla',
        is_active: true,
        yield_percentage: calculateYield(parsePrice(prop.price), estimateRent(parsePrice(prop.price))),
        roi_percentage: calculateROI(parsePrice(prop.price)),
        cash_flow_monthly: calculateCashFlow(parsePrice(prop.price), estimateRent(parsePrice(prop.price))),
        investment_score: calculateScore(parsePrice(prop.price)),
      };
    };

    const filteredItems = Array.isArray(items) ? items.filter((it) => matchesRequestedLocation(it)) : [];
    const dealsToInsert = filteredItems.map((it) => (source === 'rightmove' ? mapRightmove(it) : mapZoopla(it)));
    const validDeals = dealsToInsert.filter((d: any) => d.price > 0 && d.property_address !== 'Unknown Address');

    if (validDeals.length === 0) {
      return new Response(JSON.stringify({ imported: 0, message: 'No valid items to insert' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { error } = await supabase.from('deals_feed').insert(validDeals);
    if (error) throw error;

    return new Response(JSON.stringify({ imported: validDeals.length, source }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('apify-import error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

function extractCityFromAddress(address: string, ...fallbacks: any[]): string | null {
  for (const fallback of fallbacks) {
    if (fallback && typeof fallback === 'string' && fallback.trim()) return fallback.trim();
  }
  const parts = (address || '').split(',').map(p => p.trim());
  const ukLocations = [
    'London','Manchester','Birmingham','Leeds','Liverpool','Bristol','Sheffield','Surrey','Kent','Essex','Sussex','Hampshire','Berkshire','Middlesex',
    'Westminster','Camden','Kensington','Chelsea',
    // Surrey towns
    'Guildford','Woking','Epsom','Ewell','Reigate','Redhill','Weybridge','Walton-on-Thames','Camberley','Farnham','Dorking','Leatherhead',
    'Staines','Staines-upon-Thames','Chertsey','Egham','Godalming','Haslemere','Esher','Cobham','Banstead','Caterham','Addlestone','Sunbury','Shepperton','Frimley','Bagshot'
  ];
  for (const part of parts) {
    for (const loc of ukLocations) {
      if (part.toLowerCase().includes(loc.toLowerCase())) return loc;
    }
  }
  if (parts.length >= 2) {
    const candidate = parts[parts.length - 2];
    if (candidate && !/^[A-Z]{1,2}\d{1,2}/.test(candidate)) return candidate;
  }
  return null;
}

function mapPropertyType(type: string): string {
  const typeMap: Record<string, string> = {
    'flat': 'residential',
    'apartment': 'residential',
    'house': 'residential',
    'bungalow': 'residential',
    'maisonette': 'residential',
    'detached': 'residential',
    'semi-detached': 'residential',
    'terraced': 'residential',
    'end-terrace': 'residential',
    'studio': 'residential',
    'land': 'land',
    'commercial': 'commercial',
    'business': 'commercial',
    'office': 'commercial',
  };
  const lowered = type?.toLowerCase() || '';
  return typeMap[lowered] || 'residential';
}

function parsePrice(priceStr: string | number): number {
  if (typeof priceStr === 'number') return priceStr;
  if (!priceStr) return 0;
  const cleaned = priceStr.toString().replace(/[£,\s]/g, '');
  return parseFloat(cleaned) || 0;
}

function estimateRent(price: number): number {
  return Math.round(price * 0.004);
}

function calculateYield(price: number, rent: number): number {
  if (!price || !rent) return 0;
  return parseFloat(((rent * 12 / price) * 100).toFixed(2));
}

function calculateROI(price: number): number {
  const deposit = price * 0.25;
  const annualAppreciation = price * 0.03;
  return parseFloat(((annualAppreciation / deposit) * 100).toFixed(2));
}

function calculateCashFlow(price: number, rent: number): number {
  if (!price || !rent) return 0;
  const mortgage = (price * 0.75) * 0.05 / 12; // 75% LTV, 5% interest
  const expenses = rent * 0.2; // 20% for expenses
  return Math.round(rent - mortgage - expenses);
}

function calculateScore(price: number): string {
  const yieldPct = (estimateRent(price) * 12 / price) * 100;
  if (yieldPct >= 8) return 'A';
  if (yieldPct >= 6) return 'B';
  if (yieldPct >= 4) return 'C';
  if (yieldPct >= 2) return 'D';
  return 'E';
}
