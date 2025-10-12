import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Sample deals data
    const sampleDeals = [
      {
        property_address: "123 Victoria Road, Manchester M14 5JH",
        property_type: "residential",
        price: 185000,
        estimated_rent: 1200,
        bedrooms: 3,
        bathrooms: 2,
        square_feet: 1100,
        postcode: "M14 5JH",
        city: "Manchester",
        yield_percentage: 7.78,
        roi_percentage: 18.5,
        cash_flow_monthly: 285,
        investment_score: "A",
        ai_summary: "Excellent investment opportunity in a prime Manchester location with strong rental demand from students and young professionals. Property is well-maintained with modern fixtures and benefits from proximity to local amenities and transport links.",
        ai_recommendation: "Strong Buy - High yield with excellent rental demand",
        source: "sample",
        is_active: true,
      },
      {
        property_address: "45 Park Lane, Liverpool L8 3SD",
        property_type: "residential",
        price: 125000,
        estimated_rent: 850,
        bedrooms: 2,
        bathrooms: 1,
        square_feet: 750,
        postcode: "L8 3SD",
        city: "Liverpool",
        yield_percentage: 8.16,
        roi_percentage: 22.3,
        cash_flow_monthly: 325,
        investment_score: "A",
        ai_summary: "Outstanding value investment in Liverpool's regenerating docklands area. Strong capital appreciation potential alongside impressive rental yields. Area benefits from ongoing redevelopment and improved infrastructure.",
        ai_recommendation: "Buy - Exceptional yield with growth potential",
        source: "sample",
        is_active: true,
      },
      {
        property_address: "78 High Street, Birmingham B5 4TD",
        property_type: "commercial",
        price: 295000,
        estimated_rent: 1850,
        bedrooms: null,
        bathrooms: null,
        square_feet: 1500,
        postcode: "B5 4TD",
        city: "Birmingham",
        yield_percentage: 7.53,
        roi_percentage: 16.8,
        cash_flow_monthly: 420,
        investment_score: "B",
        ai_summary: "Well-positioned commercial unit in Birmingham city center with established tenant on 5-year lease. Strong covenant strength provides security of income. Ideal for investors seeking stable, hands-off commercial returns.",
        ai_recommendation: "Consider - Stable commercial investment with security",
        source: "sample",
        is_active: true,
      },
      {
        property_address: "12 Elm Terrace, Leeds LS6 2BQ",
        property_type: "hmo",
        price: 225000,
        estimated_rent: 2100,
        bedrooms: 5,
        bathrooms: 2,
        square_feet: 1800,
        postcode: "LS6 2BQ",
        city: "Leeds",
        yield_percentage: 11.2,
        roi_percentage: 28.5,
        cash_flow_monthly: 780,
        investment_score: "A",
        ai_summary: "Premium HMO investment near Leeds University with excellent student demand. Fully licensed and compliant with all HMO regulations. High yields offset by increased management requirements. Property in good condition with recent renovations.",
        ai_recommendation: "Strong Buy - Excellent HMO returns for experienced investors",
        source: "sample",
        is_active: true,
      },
      {
        property_address: "234 Oxford Street, London W1D 1NG",
        property_type: "residential",
        price: 425000,
        estimated_rent: 2200,
        bedrooms: 2,
        bathrooms: 2,
        square_feet: 850,
        postcode: "W1D 1NG",
        city: "London",
        yield_percentage: 6.21,
        roi_percentage: 12.5,
        cash_flow_monthly: 150,
        investment_score: "B",
        ai_summary: "Central London property with premium location near Oxford Circus. Strong capital appreciation historically but modest rental yields typical of Zone 1. Suitable for investors prioritizing location and long-term growth over immediate income.",
        ai_recommendation: "Hold/Consider - Premium location but lower yields",
        source: "sample",
        is_active: true,
      },
      {
        property_address: "67 Station Road, Bristol BS1 6QS",
        property_type: "residential",
        price: 275000,
        estimated_rent: 1550,
        bedrooms: 3,
        bathrooms: 2,
        square_feet: 1200,
        postcode: "BS1 6QS",
        city: "Bristol",
        yield_percentage: 6.76,
        roi_percentage: 15.2,
        cash_flow_monthly: 225,
        investment_score: "B",
        ai_summary: "Solid investment in Bristol's growing market with good transport connections. Property requires minor cosmetic updates but structurally sound. Area seeing increased demand from tech sector professionals relocating from London.",
        ai_recommendation: "Consider - Good potential with minor improvements needed",
        source: "sample",
        is_active: true,
      },
    ];

    console.log("Seeding sample deals...");

    const { data, error } = await supabase
      .from("deals_feed")
      .insert(sampleDeals)
      .select();

    if (error) {
      console.error("Error seeding deals:", error);
      throw error;
    }

    console.log("Successfully seeded", data?.length, "deals");

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully seeded ${data?.length} sample deals`,
        data,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in seed-sample-deals function:", error);
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
