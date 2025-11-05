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

    // Cancel deletion request
    const { error: updateError } = await supabaseClient
      .from("account_deletion_requests")
      .update({ cancelled_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("cancelled_at", null);

    if (updateError) {
      console.error("Error cancelling deletion:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to cancel account deletion" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log activity
    try {
      await supabaseClient.rpc("log_user_activity_event", {
        p_user_id: user.id,
        p_event_type: "account_deletion_cancelled",
        p_event_description: "User cancelled account deletion",
      });
    } catch (logError) {
      console.error("Error logging activity:", logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Account deletion cancelled successfully",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
