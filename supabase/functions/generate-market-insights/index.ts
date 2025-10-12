import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Generating market insights...");

    // Fetch all deals
    const { data: deals, error: dealsError } = await supabase
      .from("deals_feed")
      .select("*")
      .eq("is_active", true);

    if (dealsError) throw dealsError;

    // Group by city
    const cityGroups: Record<string, any[]> = {};
    deals?.forEach((deal) => {
      if (deal.city) {
        if (!cityGroups[deal.city]) {
          cityGroups[deal.city] = [];
        }
        cityGroups[deal.city].push(deal);
      }
    });

    console.log("Grouped deals by city:", Object.keys(cityGroups));

    // Generate insights for each city
    const insights = [];
    for (const [city, cityDeals] of Object.entries(cityGroups)) {
      if (cityDeals.length === 0) continue;

      // Calculate averages
      const avgPrice =
        cityDeals.reduce((sum, d) => sum + (d.price || 0), 0) / cityDeals.length;
      const avgRent =
        cityDeals.reduce((sum, d) => sum + (d.estimated_rent || 0), 0) /
        cityDeals.length;
      const avgYield =
        cityDeals.reduce((sum, d) => sum + (d.yield_percentage || 0), 0) /
        cityDeals.length;
      const avgROI =
        cityDeals.reduce((sum, d) => sum + (d.roi_percentage || 0), 0) /
        cityDeals.length;

      // Generate AI forecast if available
      let forecast1yr = null;
      let forecast5yr = null;

      if (LOVABLE_API_KEY) {
        try {
          const aiResponse = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  {
                    role: "system",
                    content:
                      "You are a property market analyst. Return only a JSON object with growth forecasts.",
                  },
                  {
                    role: "user",
                    content: `Analyze ${city} property market. Current avg price: £${avgPrice.toFixed(
                      0
                    )}, avg rent: £${avgRent.toFixed(
                      0
                    )}, avg yield: ${avgYield.toFixed(
                      2
                    )}%. Return JSON: {"forecast_1yr": <number>, "forecast_5yr": <number>} representing percentage growth forecasts.`,
                  },
                ],
                temperature: 0.5,
              }),
            }
          );

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const content = aiData.choices[0].message.content;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              forecast1yr = parsed.forecast_1yr;
              forecast5yr = parsed.forecast_5yr;
            }
          }
        } catch (aiError) {
          console.error("AI forecast error:", aiError);
          // Use fallback simple calculation
          forecast1yr = avgYield * 0.4; // Rough estimate
          forecast5yr = avgYield * 1.5;
        }
      } else {
        // Fallback calculation
        forecast1yr = avgYield * 0.4;
        forecast5yr = avgYield * 1.5;
      }

      insights.push({
        city,
        avg_price: avgPrice,
        avg_rent: avgRent,
        avg_yield: avgYield,
        avg_roi: avgROI,
        growth_forecast_1yr: forecast1yr,
        growth_forecast_5yr: forecast5yr,
        sample_size: cityDeals.length,
        data_date: new Date().toISOString().split("T")[0],
      });
    }

    console.log("Generated insights for", insights.length, "cities");

    // Insert insights
    const { data: insertedData, error: insertError } = await supabase
      .from("market_insights")
      .upsert(insights, {
        onConflict: "city,postcode_prefix,data_date",
      })
      .select();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated insights for ${insights.length} cities`,
        data: insertedData,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-market-insights function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
