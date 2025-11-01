import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const PLAN_MAPPING: Record<string, string> = {
  'prod_pro': 'pro',
  'prod_investor': 'investor',
  'prod_deal_lab': 'deal_lab',
  // Add your product IDs here after creating them in Stripe
};

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
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    // CRITICAL: Fail fast if webhook secret not configured
    if (!webhookSecret) {
      log("FATAL ERROR: STRIPE_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const signature = req.headers.get("stripe-signature");
    
    if (!signature) {
      log("ERROR: Missing stripe-signature header");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    log("Event received", { type: event.type, id: event.id });

    // IDEMPOTENCY CHECK: Prevent processing same event twice
    const { data: existingEvent } = await supabase
      .from("stripe_webhook_events")
      .select("id")
      .eq("event_id", event.id)
      .single();

    if (existingEvent) {
      log("Event already processed (idempotent)", { eventId: event.id });
      return new Response(JSON.stringify({ received: true, status: "duplicate" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Record event as processed
    await supabase.from("stripe_webhook_events").insert({
      event_id: event.id,
      event_type: event.type,
    });

    function getTierFromProductId(productId: string): string {
      return PLAN_MAPPING[productId] || "free";
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        
        log("Checkout completed", { customerId, subscriptionId, mode: session.mode });

        if (session.mode === 'payment') {
          // One-time purchase
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id")
            .eq("stripe_customer_id", customerId);

          if (!profiles || profiles.length === 0) {
            log("ERROR: No profile found for customer", { customerId });
            return new Response(JSON.stringify({ error: "Profile not found" }), { 
              status: 404, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            });
          }

          const userId = profiles[0].id;
          const metadata = session.metadata || {};

          await supabase.from("purchases").insert({
            user_id: userId,
            product_type: metadata.product_type || 'unknown',
            stripe_payment_intent_id: session.payment_intent as string,
            amount: session.amount_total || 0,
            currency: session.currency || 'usd',
            metadata: metadata,
          });

          log("One-time purchase recorded", { userId, productType: metadata.product_type });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const productId = subscription.items.data[0]?.price.product as string;
        const plan = getTierFromProductId(productId);
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

        log("Subscription event", { 
          customerId, 
          subscriptionId: subscription.id, 
          status: subscription.status,
          plan,
          productId
        });

        // Get user by stripe customer ID
        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (existingSub) {
          // Update entitlements table
          await supabase.from("user_entitlements").upsert({
            user_id: existingSub.user_id,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: customerId,
            plan,
            expires_at: currentPeriodEnd.toISOString(),
          }, { onConflict: "user_id" });

          // Keep legacy tables in sync
          await supabase
            .from("subscriptions")
            .update({
              stripe_subscription_id: subscription.id,
              plan,
              status: subscription.status,
              current_period_end: currentPeriodEnd.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_customer_id", customerId);

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
          .maybeSingle();

        if (sub) {
          // Update entitlements
          await supabase.from("user_entitlements").update({ 
            plan: "free",
            expires_at: new Date().toISOString() 
          }).eq("user_id", sub.user_id);

          // Keep legacy tables in sync
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
          .maybeSingle();

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
