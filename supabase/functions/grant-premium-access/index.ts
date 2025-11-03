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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    console.log("[GRANT-PREMIUM] Granting access to user:", user.id);

    // Insert or update user entitlements with all premium features
    const { error: entitlementError } = await supabaseClient
      .from("user_entitlements")
      .upsert({
        user_id: user.id,
        plan: "investor",
        features: {
          offmarket: true,
          stress_testing: true,
          api_v2: true,
          ai_assistant: true,
          portfolio_analytics: true,
          deal_lab: true,
          ai_telemetry: true,
          lease_premium: true,
        },
        expires_at: null,
      }, {
        onConflict: "user_id",
      });

    if (entitlementError) {
      console.error("[GRANT-PREMIUM] Error:", entitlementError);
      throw entitlementError;
    }

    console.log("[GRANT-PREMIUM] Successfully granted premium access");

    return new Response(
      JSON.stringify({ success: true, message: "Premium access granted" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[GRANT-PREMIUM] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
