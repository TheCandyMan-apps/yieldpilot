import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user) throw new Error("Not authenticated");

    const { listingIds, format } = await req.json(); // format: 'csv' | 'pdf'

    if (!listingIds || !Array.isArray(listingIds) || listingIds.length === 0) {
      throw new Error("listingIds required");
    }

    console.log(`[EXPORT] User ${userData.user.id} exporting ${listingIds.length} listings as ${format}`);

    // Check user's plan
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", userData.user.id)
      .single();

    const tier = profile?.subscription_tier || "free";

    // Get plan limits
    const { data: flagData } = await supabase
      .from("feature_flags")
      .select("value")
      .eq("key", "plan_limits")
      .single();

    const planLimits = flagData?.value || {};
    const userLimits = planLimits[tier] || { exports: false };

    if (!userLimits.exports) {
      return new Response(
        JSON.stringify({ error: "Exports not available on free plan. Please upgrade." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (format === "pdf" && userLimits.exports !== "all") {
      return new Response(
        JSON.stringify({ error: "PDF exports require Pro or higher plan." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch listings with metrics
    const { data: listings, error: listingError } = await supabase
      .from("listings")
      .select(`
        *,
        listing_metrics (
          kpis,
          score,
          enrichment,
          rank_score,
          factors
        )
      `)
      .in("id", listingIds)
      .eq("user_id", userData.user.id);

    if (listingError || !listings) {
      throw new Error("Failed to fetch listings");
    }

    if (format === "csv") {
      // Generate CSV
      const headers = [
        "Address",
        "Price",
        "Bedrooms",
        "Bathrooms",
        "Type",
        "Net Yield %",
        "DSCR",
        "Cashflow (pm)",
        "Score",
        "Rank",
        "EPC",
        "Source",
        "URL",
      ];

      const rows = listings.map((l: any) => {
        const metrics = l.listing_metrics?.[0];
        const kpis = metrics?.kpis || {};
        const enrichment = metrics?.enrichment || {};

        return [
          l.property_address,
          l.price,
          l.bedrooms || "",
          l.bathrooms || "",
          l.property_type || "",
          kpis.net_yield ? (kpis.net_yield * 100).toFixed(2) : "",
          kpis.dscr ? kpis.dscr.toFixed(2) : "",
          kpis.cashflow_pm || "",
          metrics?.score || "",
          metrics?.rank_score ? metrics.rank_score.toFixed(1) : "",
          enrichment.epc_rating || "",
          l.source || "",
          l.listing_url || "",
        ];
      });

      const csv = [headers, ...rows]
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\n");

      return new Response(csv, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="yieldpilot-export-${Date.now()}.csv"`,
        },
      });
    }

    if (format === "pdf") {
      // For PDF, return JSON with listings data
      // Frontend will handle jsPDF generation or call another edge function with playwright
      return new Response(
        JSON.stringify({
          ok: true,
          format: "pdf",
          listings: listings.map((l: any) => ({
            address: l.property_address,
            price: l.price,
            bedrooms: l.bedrooms,
            image: l.image_url,
            metrics: l.listing_metrics?.[0],
          })),
          message: "PDF generation not yet implemented. Use client-side jsPDF for now.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    throw new Error("Unsupported format");
  } catch (error) {
    console.error("[EXPORT] Error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
