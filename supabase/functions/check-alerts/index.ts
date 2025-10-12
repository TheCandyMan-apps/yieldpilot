import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Checking alerts for matches...");

    // Fetch all active alerts
    const { data: alerts, error: alertsError } = await supabase
      .from("alerts")
      .select("*")
      .eq("is_active", true);

    if (alertsError) throw alertsError;

    if (!alerts || alerts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No active alerts to check",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Found ${alerts.length} active alerts`);

    let totalMatches = 0;

    // Check each alert
    for (const alert of alerts) {
      // Build query
      let query = supabase
        .from("deals_feed")
        .select("*")
        .eq("is_active", true);

      // Apply filters based on alert criteria
      if (alert.min_yield) {
        query = query.gte("yield_percentage", alert.min_yield);
      }
      if (alert.min_roi) {
        query = query.gte("roi_percentage", alert.min_roi);
      }
      if (alert.min_price) {
        query = query.gte("price", alert.min_price);
      }
      if (alert.max_price) {
        query = query.lte("price", alert.max_price);
      }
      if (alert.property_type) {
        query = query.eq("property_type", alert.property_type);
      }
      if (alert.location_filter) {
        // Check if location matches city or postcode
        query = query.or(
          `city.ilike.%${alert.location_filter}%,postcode.ilike.%${alert.location_filter}%,property_address.ilike.%${alert.location_filter}%`
        );
      }

      const { data: matchingDeals, error: dealsError } = await query;

      if (dealsError) {
        console.error(`Error querying deals for alert ${alert.id}:`, dealsError);
        continue;
      }

      if (!matchingDeals || matchingDeals.length === 0) {
        continue;
      }

      console.log(`Alert ${alert.name} found ${matchingDeals.length} matches`);

      // Insert alert matches (ignore duplicates due to UNIQUE constraint)
      const matches = matchingDeals.map((deal) => ({
        alert_id: alert.id,
        deal_id: deal.id,
      }));

      const { data: insertedMatches, error: matchError } = await supabase
        .from("alert_matches")
        .upsert(matches, { onConflict: "alert_id,deal_id", ignoreDuplicates: true })
        .select();

      if (matchError) {
        console.error(`Error inserting matches for alert ${alert.id}:`, matchError);
        continue;
      }

      const newMatches = insertedMatches?.length || 0;
      totalMatches += newMatches;

      // Update alert's last_triggered_at if new matches were found
      if (newMatches > 0) {
        await supabase
          .from("alerts")
          .update({ last_triggered_at: new Date().toISOString() })
          .eq("id", alert.id);

        console.log(`Added ${newMatches} new matches for alert ${alert.name}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Checked ${alerts.length} alerts, found ${totalMatches} new matches`,
        alertsChecked: alerts.length,
        newMatches: totalMatches,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in check-alerts function:", error);
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
