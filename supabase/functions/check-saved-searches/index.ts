import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple resend API helper
async function sendEmail(to: string, subject: string, html: string) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.warn("[check-saved-searches] RESEND_API_KEY not configured, skipping email");
    return null;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "YieldPilot Alerts <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${error}`);
  }

  return response.json();
}

interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  criteria: {
    min_price?: number;
    max_price?: number;
    min_yield?: number;
    min_score?: number;
    location?: string;
    bedrooms?: number;
    property_type?: string;
  };
  frequency: string;
  last_run_at: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("[check-saved-searches] Starting search check");

    // Get all active saved searches that need to run
    const { data: searches, error: searchError } = await supabase
      .from("saved_searches")
      .select("*")
      .eq("is_active", true);

    if (searchError) {
      console.error("[check-saved-searches] Error fetching searches:", searchError);
      throw searchError;
    }

    console.log(`[check-saved-searches] Found ${searches?.length || 0} active searches`);

    let totalMatches = 0;

    for (const search of searches || []) {
      try {
        // Check if we should run this search based on frequency
        if (search.last_run_at) {
          const lastRun = new Date(search.last_run_at);
          const now = new Date();
          const hoursSinceLastRun = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60);

          if (search.frequency === "daily" && hoursSinceLastRun < 24) {
            console.log(`[check-saved-searches] Skipping search ${search.id} - ran ${hoursSinceLastRun.toFixed(1)}h ago`);
            continue;
          }
          if (search.frequency === "weekly" && hoursSinceLastRun < 168) {
            console.log(`[check-saved-searches] Skipping search ${search.id} - ran ${hoursSinceLastRun.toFixed(1)}h ago`);
            continue;
          }
        }

        console.log(`[check-saved-searches] Running search: ${search.name}`);

        // Build query for listings
        let query = supabase
          .from("listings")
          .select(`
            id,
            address_line1,
            address_town,
            postcode,
            price,
            bedrooms,
            property_type,
            listing_metrics (
              score,
              kpis
            )
          `)
          .eq("is_active", true);

        // Apply criteria filters
        const criteria = search.criteria as SavedSearch["criteria"];

        if (criteria.min_price) {
          query = query.gte("price", criteria.min_price);
        }
        if (criteria.max_price) {
          query = query.lte("price", criteria.max_price);
        }
        if (criteria.bedrooms) {
          query = query.eq("bedrooms", criteria.bedrooms);
        }
        if (criteria.property_type) {
          query = query.eq("property_type", criteria.property_type);
        }
        if (criteria.location) {
          query = query.or(`address_line1.ilike.%${criteria.location}%,address_town.ilike.%${criteria.location}%,postcode.ilike.%${criteria.location}%`);
        }

        // Only get recent listings (created in last 24 hours)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        query = query.gte("created_at", yesterday.toISOString());

        const { data: listings, error: listingsError } = await query;

        if (listingsError) {
          console.error(`[check-saved-searches] Error fetching listings for search ${search.id}:`, listingsError);
          continue;
        }

        // Filter by score and yield if specified
        let matches = listings || [];
        
        if (criteria.min_score) {
          matches = matches.filter(l => {
            const score = l.listing_metrics?.[0]?.score || 0;
            return score >= criteria.min_score!;
          });
        }

        if (criteria.min_yield) {
          matches = matches.filter(l => {
            const yield_pct = l.listing_metrics?.[0]?.kpis?.gross_yield_pct || 0;
            return yield_pct >= criteria.min_yield!;
          });
        }

        console.log(`[check-saved-searches] Found ${matches.length} matches for search ${search.id}`);

        // Get user profile for email
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", search.user_id)
          .single();

        // Get user email
        const { data: { user } } = await supabase.auth.admin.getUserById(search.user_id);

        // Create alert matches
        if (matches.length > 0) {
          // Check which matches are new (not already in alert_matches for this search)
          const { data: existingMatches } = await supabase
            .from("alerts")
            .select("id")
            .eq("user_id", search.user_id)
            .eq("name", search.name)
            .single();

          let alertId = existingMatches?.id;

          // Create alert if doesn't exist
          if (!alertId) {
            const { data: newAlert } = await supabase
              .from("alerts")
              .insert({
                user_id: search.user_id,
                name: search.name,
                alert_type: "saved_search",
                location_filter: criteria.location,
                min_price: criteria.min_price,
                max_price: criteria.max_price,
                min_yield: criteria.min_yield,
              })
              .select("id")
              .single();
            
            alertId = newAlert?.id;
          }

          if (alertId) {
            // Get existing matches to avoid duplicates
            const { data: existingAlertMatches } = await supabase
              .from("alert_matches")
              .select("deal_id")
              .eq("alert_id", alertId);

            const existingDealIds = new Set(existingAlertMatches?.map(m => m.deal_id) || []);

            const newMatches = matches.filter(m => !existingDealIds.has(m.id));

            if (newMatches.length > 0) {
              // Insert new matches
              const matchInserts = newMatches.map(listing => ({
                alert_id: alertId!,
                deal_id: listing.id,
              }));

              const { error: matchError } = await supabase
                .from("alert_matches")
                .insert(matchInserts);

              if (matchError) {
                console.error(`[check-saved-searches] Error creating matches:`, matchError);
              } else {
                totalMatches += newMatches.length;
                console.log(`[check-saved-searches] Created ${newMatches.length} new matches`);

                // Send email notification
                if (user?.email) {
                  try {
                    const userName = profile?.full_name || "there";
                    const matchList = newMatches.slice(0, 5).map(l => 
                      `• ${l.address_line1}, ${l.address_town || ''} - £${l.price.toLocaleString()}`
                    ).join('\n');

                    const moreText = newMatches.length > 5 ? `\n...and ${newMatches.length - 5} more` : '';

                    await sendEmail(
                      user.email,
                      `🎯 ${newMatches.length} new property ${newMatches.length === 1 ? 'match' : 'matches'} for "${search.name}"`,
                      `
                        <h2>Hi ${userName}! 👋</h2>
                        <p>Great news! We found <strong>${newMatches.length} new ${newMatches.length === 1 ? 'property' : 'properties'}</strong> matching your saved search "${search.name}":</p>
                        <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px;">${matchList}${moreText}</pre>
                        <p><a href="${supabaseUrl.replace('//', '//app.')}/alerts" style="background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View All Matches</a></p>
                        <p style="color: #666; font-size: 12px; margin-top: 30px;">You're receiving this because you have an active saved search. <a href="${supabaseUrl.replace('//', '//app.')}/saved-searches">Manage your searches</a></p>
                      `
                    );
                    console.log(`[check-saved-searches] Email sent to ${user.email}`);
                  } catch (emailError) {
                    console.error(`[check-saved-searches] Error sending email:`, emailError);
                  }
                }
              }
            }
          }
        }

        // Update last_run_at
        await supabase
          .from("saved_searches")
          .update({ 
            last_run_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("id", search.id);

        // Log execution
        await supabase
          .from("alerts_log")
          .insert({
            search_id: search.id,
            matches_found: matches.length,
          });

      } catch (searchExecError) {
        console.error(`[check-saved-searches] Error processing search ${search.id}:`, searchExecError);
      }
    }

    console.log(`[check-saved-searches] Complete. Total new matches: ${totalMatches}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        searches_processed: searches?.length || 0,
        total_matches: totalMatches 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[check-saved-searches] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
};

serve(handler);
