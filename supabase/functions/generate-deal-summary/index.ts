import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const { deal } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating deal summary for:", deal.address);

    const prompt = `Generate a professional investment summary for this property deal. Return ONLY valid JSON with no markdown or additional text.

Property Details:
- Address: ${deal.address}
- Price: £${deal.price}
- Monthly Rent: £${deal.rent || "N/A"}
- Yield: ${deal.yield || "N/A"}%
- ROI: ${deal.roi || "N/A"}%
- Monthly Cash Flow: £${deal.cashFlow || "N/A"}
- Investment Score: ${deal.score || "N/A"}
- City: ${deal.city || "N/A"}
- Type: ${deal.type || "residential"}

Generate a JSON response with these exact fields:
{
  "title": "<catchy 8-12 word title emphasizing investment potential>",
  "summary": "<professional 200-word analysis covering: property strengths, market position, rental potential, financial metrics, growth prospects, and key considerations>",
  "risk_rating": "<Low/Medium/High with 1-sentence explanation>",
  "recommendation": "<Strong Buy/Buy/Hold/Avoid with clear reasoning>",
  "key_metrics": {
    "yield": <number>,
    "roi": <number>,
    "cashFlow": <number>,
    "investmentScore": "<A-E>"
  }
}

Return ONLY the JSON object, no markdown formatting.`;

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
                "You are a professional property investment analyst. Return only valid JSON objects with no markdown or additional formatting.",
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

    let summary;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        summary = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiContent);
      // Fallback summary
      summary = {
        title: `Investment Opportunity: ${deal.address}`,
        summary: `This property presents a ${deal.yield > 6 ? "strong" : "moderate"} investment opportunity with a yield of ${deal.yield}% and ROI of ${deal.roi}%. Located in ${deal.city}, the property offers ${deal.cashFlow > 0 ? "positive" : "neutral"} monthly cash flow of £${deal.cashFlow}. The investment score of ${deal.score} reflects the overall quality of this deal based on financial metrics and market conditions. Consider this property for ${deal.yield > 7 ? "immediate investment" : "further due diligence"}.`,
        risk_rating: deal.yield > 8 ? "Low - Strong fundamentals and good returns" : deal.yield > 5 ? "Medium - Decent returns with standard market risks" : "High - Lower returns, thorough analysis recommended",
        recommendation: deal.score === "A" || deal.score === "B" ? "Buy - Good investment opportunity" : deal.score === "C" ? "Hold - Requires further analysis" : "Review - Consider alternatives",
        key_metrics: {
          yield: deal.yield || 0,
          roi: deal.roi || 0,
          cashFlow: deal.cashFlow || 0,
          investmentScore: deal.score || "C",
        },
      };
    }

    console.log("Generated summary:", summary);

    return new Response(
      JSON.stringify({ success: true, summary }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-deal-summary function:", error);
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
