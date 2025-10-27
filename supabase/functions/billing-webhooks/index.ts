import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const log = (step: string, data?: any) => {
  console.log(`[BILLING-WEBHOOK] ${step}`, data ? JSON.stringify(data) : '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!signature || !webhookSecret) {
      throw new Error("Missing signature or webhook secret");
    }

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    log("Event received", { type: event.type, id: event.id });

    // Map product IDs to tiers
    const tierMap: Record<string, string> = {
      "prod_TIQGr19KW6WSf2": "pro",
      "prod_TIQG8NQ9FVZHVD": "investor",
      "prod_TIQPO5z7ZmKw3Q": "team",
    };

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const productId = subscription.items.data[0]?.price.product as string;
        const plan = tierMap[productId] || "free";

        log("Subscription event", { 
          customerId, 
          subscriptionId: subscription.id, 
          status: subscription.status,
          plan 
        });

        // Get user by stripe customer ID
        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (existingSub) {
          // Update existing subscription
          await supabase
            .from("subscriptions")
            .update({
              stripe_subscription_id: subscription.id,
              plan,
              status: subscription.status,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_customer_id", customerId);

          // Update profile
          await supabase
            .from("profiles")
            .update({ subscription_tier: plan })
            .eq("id", existingSub.user_id);

          log("Subscription updated", { userId: existingSub.user_id, plan });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        log("Subscription deleted", { customerId, subscriptionId: subscription.id });

        // Get user and set to free tier
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (sub) {
          await supabase
            .from("subscriptions")
            .update({
              plan: "free",
              status: "canceled",
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_customer_id", customerId);

          await supabase
            .from("profiles")
            .update({ subscription_tier: "free" })
            .eq("id", sub.user_id);

          log("User downgraded to free", { userId: sub.user_id });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        log("Payment succeeded", { customerId, invoiceId: invoice.id });

        // Ensure subscription is marked active
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("stripe_customer_id", customerId)
          .single();

        if (sub && sub.status !== "active") {
          await supabase
            .from("subscriptions")
            .update({ status: "active", updated_at: new Date().toISOString() })
            .eq("stripe_customer_id", customerId);

          log("Subscription activated", { userId: sub.user_id });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        log("Payment failed", { customerId, invoiceId: invoice.id });

        await supabase
          .from("subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("stripe_customer_id", customerId);
        break;
      }

      default:
        log("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
