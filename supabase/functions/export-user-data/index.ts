import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Collect user data from various tables
    const exportData: any = {
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
      profile: null,
      activity_logs: [],
      portfolios: [],
      saved_searches: [],
      watchlist: [],
    };

    // Get profile
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    exportData.profile = profile;

    // Get activity logs
    const { data: activityLogs } = await supabaseClient
      .from("user_activity_log")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    exportData.activity_logs = activityLogs || [];

    // Get portfolios
    const { data: portfolios } = await supabaseClient
      .from("portfolios")
      .select("*")
      .eq("user_id", user.id);
    exportData.portfolios = portfolios || [];

    // Get saved searches
    const { data: searches } = await supabaseClient
      .from("saved_searches")
      .select("*")
      .eq("user_id", user.id);
    exportData.saved_searches = searches || [];

    // Get watchlist
    const { data: watchlist } = await supabaseClient
      .from("watchlist")
      .select("*")
      .eq("user_id", user.id);
    exportData.watchlist = watchlist || [];

    // Log activity
    try {
      await supabaseClient.rpc("log_user_activity_event", {
        p_user_id: user.id,
        p_event_type: "data_export",
        p_event_description: "User exported their data",
      });
    } catch (logError) {
      console.error("Error logging activity:", logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: exportData,
        exported_at: new Date().toISOString(),
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="yieldpilot-data-export-${Date.now()}.json"`
        } 
      }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
