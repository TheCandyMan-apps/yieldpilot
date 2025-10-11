import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const {
      propertyAddress,
      propertyPrice,
      propertyType,
      estimatedRent,
      mortgageRate,
      depositAmount,
      monthlyCosts,
    } = await req.json();

    console.log("Analyzing property:", { propertyAddress, propertyPrice });

    // Create the analysis record
    const { data: analysis, error: insertError } = await supabase
      .from("property_analyses")
      .insert({
        user_id: user.id,
        property_address: propertyAddress,
        property_price: propertyPrice,
        property_type: propertyType,
        estimated_rent: estimatedRent,
        mortgage_rate: mortgageRate,
        deposit_amount: depositAmount,
        monthly_costs: monthlyCosts,
        analysis_status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw insertError;
    }

    // Call AI for analysis
    const aiPrompt = `You are a property investment analyst. Analyze this property deal and provide detailed investment insights.

Property Details:
- Address: ${propertyAddress}
- Purchase Price: £${propertyPrice.toLocaleString()}
- Property Type: ${propertyType}
- Estimated Monthly Rent: £${estimatedRent}
- Mortgage Rate: ${mortgageRate}%
- Deposit: £${depositAmount.toLocaleString()}
- Monthly Costs (maintenance, insurance, etc.): £${monthlyCosts}

Calculate and provide:
1. ROI % (Return on Investment)
2. Net Yield % (Annual rental income minus costs / property price)
3. Monthly Cash Flow (rental income minus mortgage payment minus costs)
4. Deal Quality Score (0-100, where 100 is excellent)
5. Investment Commentary (150-200 words covering risks, opportunities, and recommendation)

Format your response as JSON with these exact keys:
{
  "roi_percentage": number,
  "net_yield_percentage": number,
  "cash_flow_monthly": number,
  "deal_quality_score": number,
  "ai_commentary": "string"
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a property investment analyst. Always respond with valid JSON only.",
          },
          {
            role: "user",
            content: aiPrompt,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI response error:", errorText);
      throw new Error(`AI analysis failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    
    console.log("AI response:", aiContent);

    // Parse AI response
    let analysisResults;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = aiContent.match(/```json\n([\s\S]*?)\n```/) || 
                       aiContent.match(/```\n([\s\S]*?)\n```/) ||
                       [null, aiContent];
      const jsonString = jsonMatch[1] || aiContent;
      analysisResults = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      throw new Error("Failed to parse AI analysis results");
    }

    // Update the analysis with results
    const { error: updateError } = await supabase
      .from("property_analyses")
      .update({
        roi_percentage: analysisResults.roi_percentage,
        net_yield_percentage: analysisResults.net_yield_percentage,
        cash_flow_monthly: analysisResults.cash_flow_monthly,
        deal_quality_score: analysisResults.deal_quality_score,
        ai_commentary: analysisResults.ai_commentary,
        analysis_status: "completed",
      })
      .eq("id", analysis.id);

    if (updateError) {
      console.error("Update error:", updateError);
      throw updateError;
    }

    // Increment user's analysis count
    await supabase.rpc("increment", {
      row_id: user.id,
      x: 1,
    }).select();

    return new Response(
      JSON.stringify({ 
        ...analysis, 
        ...analysisResults,
        analysis_status: "completed"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in analyze-property function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});