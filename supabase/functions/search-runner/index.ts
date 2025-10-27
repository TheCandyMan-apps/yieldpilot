import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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

    const { searchId } = await req.json();

    console.log("[SEARCH-RUNNER] Starting for searchId:", searchId);

    // Get the saved search
    const { data: search, error: searchError } = await supabase
      .from("saved_searches")
      .select("*")
      .eq("id", searchId)
      .single();

    if (searchError || !search) {
      throw new Error("Saved search not found");
    }

    if (!search.active) {
      return new Response(
        JSON.stringify({ ok: false, message: "Search is not active" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check frequency and last run
    const { data: lastLog } = await supabase
      .from("alerts_log")
      .select("sent_at")
      .eq("saved_search_id", searchId)
      .order("sent_at", { ascending: false })
      .limit(1)
      .single();

    const now = new Date();
    if (lastLog) {
      const lastRun = new Date(lastLog.sent_at);
      const hoursSinceRun = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60);

      if (search.frequency === "daily" && hoursSinceRun < 24) {
        return new Response(
          JSON.stringify({ ok: false, message: "Already ran today" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (search.frequency === "weekly" && hoursSinceRun < 168) {
        return new Response(
          JSON.stringify({ ok: false, message: "Already ran this week" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Build query from saved search criteria
    const query = search.query as Record<string, any>;
    let dbQuery = supabase
      .from("deals_feed")
      .select("*")
      .eq("is_active", true);

    if (query.location) {
      dbQuery = dbQuery.ilike("city", `%${query.location}%`);
    }
    if (query.min_beds) {
      dbQuery = dbQuery.gte("bedrooms", query.min_beds);
    }
    if (query.max_price) {
      dbQuery = dbQuery.lte("price", query.max_price);
    }
    if (query.min_yield) {
      dbQuery = dbQuery.gte("yield_percentage", query.min_yield);
    }
    if (query.property_type) {
      dbQuery = dbQuery.eq("property_type", query.property_type);
    }

    // Get matches
    const { data: matches, error: matchError } = await dbQuery
      .order("created_at", { ascending: false })
      .limit(50);

    if (matchError) throw matchError;

    const matchCount = matches?.length || 0;

    console.log(`[SEARCH-RUNNER] Found ${matchCount} matches for search "${search.name}"`);

    // Log the alert
    await supabase
      .from("alerts_log")
      .insert({
        saved_search_id: searchId,
        matches: matchCount,
        sent_at: now.toISOString(),
      });

    // TODO: Send email with matches (integrate with Resend or other email service)
    // For now, just return the count

    return new Response(
      JSON.stringify({
        ok: true,
        searchName: search.name,
        matches: matchCount,
        results: matches?.slice(0, 10), // Top 10
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[SEARCH-RUNNER] Error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
