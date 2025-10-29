import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertEmailRequest {
  userEmail: string;
  userName: string;
  alertName: string;
  matchedDeals: Array<{
    address: string;
    price: number;
    yield: number;
    url: string;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, userName, alertName, matchedDeals }: AlertEmailRequest = await req.json();

    const dealsHtml = matchedDeals
      .map(
        (deal) => `
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
          <h3 style="margin: 0 0 8px 0; color: #111827;">${deal.address}</h3>
          <p style="margin: 4px 0; color: #6b7280;">
            <strong>Price:</strong> £${deal.price.toLocaleString()}<br/>
            <strong>Yield:</strong> ${deal.yield.toFixed(2)}%
          </p>
          <a href="${deal.url}" style="color: #00B2A9; text-decoration: none;">View Property →</a>
        </div>
      `
      )
      .join("");

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "YieldPilot <alerts@yieldpilot.app>",
        to: [userEmail],
        subject: `New Properties Match Your Alert: ${alertName}`,
        html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #00B2A9 0%, #005F5B 100%); padding: 32px; border-radius: 12px; margin-bottom: 24px;">
              <h1 style="margin: 0; color: white; font-size: 24px;">🎯 New Property Matches!</h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9);">Your alert "${alertName}" found ${matchedDeals.length} new ${matchedDeals.length === 1 ? 'property' : 'properties'}</p>
            </div>

            <div style="margin-bottom: 24px;">
              <p style="margin: 0 0 16px 0;">Hi ${userName},</p>
              <p style="margin: 0 0 16px 0;">Great news! We found ${matchedDeals.length} new ${matchedDeals.length === 1 ? 'property' : 'properties'} that match your saved alert criteria.</p>
            </div>

            ${dealsHtml}

            <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
                <a href="https://yieldpilot.app/alerts" style="color: #00B2A9; text-decoration: none;">Manage your alerts</a> | 
                <a href="https://yieldpilot.app/dashboard" style="color: #00B2A9; text-decoration: none;">View all deals</a>
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                You're receiving this because you have active alerts on YieldPilot. 
                You can manage your email preferences in your account settings.
              </p>
            </div>
          </body>
        </html>
      `,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      throw new Error(emailData.message || "Failed to send email");
    }

    console.log("Alert email sent successfully:", emailData);

    return new Response(JSON.stringify(emailData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending alert email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
