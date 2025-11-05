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

    const { password, reason, exportData } = await req.json();

    // Verify password
    const { error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: user.email!,
      password: password,
    });

    if (signInError) {
      return new Response(
        JSON.stringify({ error: "Invalid password" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate deletion date (30 days from now)
    const scheduledDeletionAt = new Date();
    scheduledDeletionAt.setDate(scheduledDeletionAt.getDate() + 30);

    // Create deletion request
    const { error: insertError } = await supabaseClient
      .from("account_deletion_requests")
      .insert({
        user_id: user.id,
        scheduled_deletion_at: scheduledDeletionAt.toISOString(),
        reason: reason || null,
        data_export_requested: exportData || false,
      });

    if (insertError) {
      console.error("Error creating deletion request:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to schedule account deletion" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log activity
    try {
      await supabaseClient.rpc("log_user_activity_event", {
        p_user_id: user.id,
        p_event_type: "account_deletion_requested",
        p_event_description: "User requested account deletion",
      });
    } catch (logError) {
      console.error("Error logging activity:", logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        scheduledDeletionAt: scheduledDeletionAt.toISOString(),
        message: "Account deletion scheduled. You have 30 days to cancel.",
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
