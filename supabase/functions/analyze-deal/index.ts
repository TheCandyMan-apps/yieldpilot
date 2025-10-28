import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const { property } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Analyzing property:", property);

    // Create the AI prompt
    const prompt = `Evaluate this investment property and return ONLY a valid JSON object with no additional text:

Property Details:
- Address: ${property.address}
- Price: £${property.price}
- Estimated Rent: £${property.rent}/month
- Location: ${property.city || "N/A"}
- Property Type: ${property.propertyType || "residential"}
- Bedrooms: ${property.bedrooms || "N/A"}
- Bathrooms: ${property.bathrooms || "N/A"}

Calculate and return JSON with these exact fields:
{
  "yield_percentage": <annual rent / price * 100>,
  "roi_percentage": <estimated ROI after costs>,
  "cash_flow_monthly": <monthly rent - estimated mortgage - expenses>,
  "investment_score": "<A, B, C, D, or E based on overall investment quality>",
  "ai_summary": "<200-word professional summary of investment potential>",
  "ai_recommendation": "<buy/hold/avoid with brief reasoning>"
}

Score Guidelines:
A = Excellent (Yield >8%, ROI >20%, strong location)
B = Good (Yield 6-8%, ROI 15-20%, decent location)
C = Fair (Yield 4-6%, ROI 10-15%, average location)
D = Below Average (Yield 3-4%, ROI 5-10%)
E = Poor (Yield <3%, ROI <5%)

Return only valid JSON, no markdown, no explanations.`;

    // Call Lovable AI (GPT-4)
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
                "You are a property investment analyst. Return only valid JSON objects with no additional text or markdown formatting.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;

    console.log("AI response:", aiContent);

    // Parse the AI response
    let analysisResult;
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiContent);
      // Provide fallback calculations
      const annualRent = property.rent * 12;
      const yieldPercentage = (annualRent / property.price) * 100;
      
      analysisResult = {
        yield_percentage: yieldPercentage,
        roi_percentage: yieldPercentage * 0.8, // Rough estimate
        cash_flow_monthly: property.rent * 0.15, // Rough estimate
        investment_score: yieldPercentage > 8 ? "A" : yieldPercentage > 6 ? "B" : yieldPercentage > 4 ? "C" : "D",
        ai_summary: "Analysis based on basic calculations. This property shows potential for rental income with estimated yields.",
        ai_recommendation: yieldPercentage > 6 ? "Consider for further analysis" : "Review other opportunities",
      };
    }

    console.log("Final analysis result:", analysisResult);

    return new Response(JSON.stringify({ success: true, data: analysisResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-deal function:", error);
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
