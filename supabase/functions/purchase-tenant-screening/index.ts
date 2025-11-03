import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: any) => {
  console.log(`[PURCHASE-SCREENING] ${step}`, details ? JSON.stringify(details) : '');
};

const SCREENING_PRICES: Record<string, { priceId: string; cost: number }> = {
  basic: { priceId: "price_tenant_screening_basic_placeholder", cost: 29 },
  enhanced: { priceId: "price_tenant_screening_enhanced_placeholder", cost: 49 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Starting tenant screening purchase");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }

    const { screening_type, tenant_name, tenant_email, property_address } = await req.json();
    
    if (!screening_type || !tenant_name) {
      throw new Error("screening_type and tenant_name are required");
    }

    const screeningConfig = SCREENING_PRICES[screening_type];
    if (!screeningConfig) {
      throw new Error("Invalid screening type");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: userData.user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    log("Creating checkout session");

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userData.user.email,
      line_items: [
        {
          price: screeningConfig.priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/billing?screening=success`,
      cancel_url: `${req.headers.get("origin")}/billing?screening=cancelled`,
      metadata: {
        user_id: userData.user.id,
        product_type: "tenant_screening",
        screening_type: screening_type,
        tenant_name: tenant_name,
        tenant_email: tenant_email || "",
        property_address: property_address || "",
      },
    });

    log("Checkout session created", { session_id: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
