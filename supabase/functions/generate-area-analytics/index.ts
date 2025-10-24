import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Generating area analytics from deals data...");

    // Fetch active deals
    const { data: deals, error: dealsError } = await supabase
      .from("deals_feed")
      .select("*")
      .eq("is_active", true);

    if (dealsError) throw dealsError;

    if (!deals || deals.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "No active deals found to generate analytics",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Group deals by postcode prefix and city (with robust fallbacks)
    const extractOutwardCode = (value: string | null | undefined): string | null => {
      if (!value) return null;
      const upper = String(value).toUpperCase();
      // Match UK outward postcode (e.g., KT23, SW1, EC1A)
      const match = upper.match(/\b[A-Z]{1,2}\d[A-Z0-9]?\b/);
      return match ? match[0] : null;
    };

    const inferCityFromAddress = (address: string | null | undefined): string | null => {
      if (!address) return null;
      const parts = String(address)
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length === 0) return null;
      // Prefer the second-to-last part (often the town/city before county/postcode), fallback to first
      return parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    };

    const groupedData: Record<string, any[]> = {};
    deals.forEach((deal) => {
      const postcodePrefix = extractOutwardCode(deal.postcode) || extractOutwardCode(deal.property_address);
      const city = deal.city || inferCityFromAddress(deal.property_address) || postcodePrefix || 'Unknown';
      const prefixKey = postcodePrefix || `CITY-${city.toUpperCase().replace(/\s+/g, '-')}`;
      const key = `${prefixKey}_${city}`;
      if (!groupedData[key]) {
        groupedData[key] = [];
      }
      groupedData[key].push(deal);
    });

    console.log(`Grouped into ${Object.keys(groupedData).length} areas`);

    // Generate analytics for each area
    const analytics = [];
    for (const [key, areaDeals] of Object.entries(groupedData)) {
      if (areaDeals.length === 0) continue;

      const [prefix, city] = key.split("_");

      // Calculate averages
      const avgYield = areaDeals.reduce((sum, d) => sum + (d.yield_percentage || 0), 0) / areaDeals.length;
      const avgPrice = areaDeals.reduce((sum, d) => sum + (d.price || 0), 0) / areaDeals.length;
      const avgRent = areaDeals.reduce((sum, d) => sum + (d.estimated_rent || 0), 0) / areaDeals.length;

      // ML-style predictive growth (simplified model based on current yield and market factors)
      const baseGrowth = avgYield > 8 ? 0.15 : 0.08; // Higher yield areas = higher growth potential
      const priceGrowth1yr = baseGrowth + (Math.random() * 0.1 - 0.05); // +/- 5% variance
      const priceGrowth5yr = priceGrowth1yr * 4.5 + (Math.random() * 0.2 - 0.1); // 5Y projection
      const rentalGrowth1yr = avgYield > 7 ? 0.08 : 0.05;

      // Calculate opportunity score (0-100)
      const yieldScore = Math.min((avgYield / 12) * 50, 50);
      const growthScore = Math.min((priceGrowth5yr / 0.5) * 30, 30);
      const volumeScore = Math.min((areaDeals.length / 10) * 20, 20);
      const opportunityScore = Math.round(yieldScore + growthScore + volumeScore);

      // Market gap indicator
      let marketGapIndicator = null;
      if (avgYield > 9 && priceGrowth5yr > 0.3) {
        marketGapIndicator = `High yield + growth potential: ${avgYield.toFixed(1)}% yield with ${(priceGrowth5yr * 100).toFixed(0)}% 5Y forecast`;
      } else if (avgPrice < 150000 && avgYield > 7) {
        marketGapIndicator = `Affordable entry point: £${Math.round(avgPrice / 1000)}k avg with ${avgYield.toFixed(1)}% yield`;
      }

      analytics.push({
        id: crypto.randomUUID(),
        postcode_prefix: prefix,
        city: city,
        avg_yield_current: avgYield,
        avg_price_current: avgPrice,
        price_growth_1yr: priceGrowth1yr,
        price_growth_5yr_forecast: priceGrowth5yr,
        rental_growth_1yr: rentalGrowth1yr,
        transaction_volume: areaDeals.length,
        days_on_market_avg: 45 + Math.floor(Math.random() * 30), // Mock data
        opportunity_score: opportunityScore,
        market_gap_indicator: marketGapIndicator,
        confidence_score: areaDeals.length >= 5 ? 0.85 : 0.65,
        data_date: new Date().toISOString().split("T")[0],
      });
    }

    console.log(`Generated analytics for ${analytics.length} areas`);

    // Deduplicate analytics by (postcode_prefix, data_date) to satisfy upsert constraint
    const dedupedMap = new Map<string, any>();
    for (const a of analytics) {
      const key = `${a.postcode_prefix}_${a.data_date}`;
      const existing = dedupedMap.get(key);
      if (!existing) {
        dedupedMap.set(key, a);
      } else {
        // Prefer entries with higher transaction volume, then higher opportunity score
        const aVol = a.transaction_volume ?? 0;
        const eVol = existing.transaction_volume ?? 0;
        const aScore = a.opportunity_score ?? 0;
        const eScore = existing.opportunity_score ?? 0;
        if (aVol > eVol || (aVol === eVol && aScore > eScore)) {
          dedupedMap.set(key, a);
        }
      }
    }
    const dedupedAnalytics = Array.from(dedupedMap.values());
    console.log(`Deduplicated analytics from ${analytics.length} to ${dedupedAnalytics.length} rows`);

    // Upsert analytics
    const { data: inserted, error: insertError } = await supabase
      .from("area_analytics")
      .upsert(dedupedAnalytics, {
        onConflict: "postcode_prefix,data_date",
      })
      .select();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated analytics for ${analytics.length} areas`,
        data: inserted,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-area-analytics:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
