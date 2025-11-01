import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Schema validation
interface DealSummarySchema {
  drivers: string[];
  risks: string[];
}

function validateSchema(data: any): data is DealSummarySchema {
  if (!data || typeof data !== "object") return false;
  if (!Array.isArray(data.drivers) || !Array.isArray(data.risks)) return false;
  if (data.drivers.length > 3 || data.risks.length > 3) return false;
  if (!data.drivers.every((d: any) => typeof d === "string" && d.length <= 100)) return false;
  if (!data.risks.every((r: any) => typeof r === "string" && r.length <= 100)) return false;
  return true;
}

// Heuristic fallback (non-AI)
function generateHeuristicSummary(deal: any): DealSummarySchema {
  const drivers: string[] = [];
  const risks: string[] = [];

  // Drivers
  if (deal.netYield >= 7) drivers.push(`Strong ${deal.netYield.toFixed(1)}% net yield`);
  if (deal.cashFlow >= 200) drivers.push(`Positive £${Math.round(deal.cashFlow)}/mo cashflow`);
  if (deal.dscr >= 1.25) drivers.push(`Healthy DSCR ${deal.dscr?.toFixed(2) || "N/A"}`);
  if (drivers.length === 0) drivers.push("Stable rental income potential");

  // Risks
  if (deal.netYield < 5) risks.push("Low yield (<5%)");
  if (deal.cashFlow < 0) risks.push("Negative monthly cashflow");
  if (!deal.epc || deal.epc === "unknown") {
    risks.push("EPC: unknown (treat as upgrade risk)");
  } else if (["E", "F", "G"].includes(deal.epc)) {
    risks.push(`EPC ${deal.epc} - upgrade required`);
  }
  if (risks.length === 0) risks.push("Standard market risks apply");

  return {
    drivers: drivers.slice(0, 3),
    risks: risks.slice(0, 3),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Require authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate user session
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { deal } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating deal summary for:", deal.address);

    // Prepare structured inputs with guardrails
    const inputs = {
      address: deal.address || "Address not provided",
      price: deal.price || 0,
      rent: deal.rent || "unknown",
      grossYield: deal.grossYield || "unknown",
      netYield: deal.netYield || "unknown",
      roi: deal.roi || "unknown",
      cashFlow: deal.cashFlow || "unknown",
      dscr: deal.dscr || "unknown",
      rentSource: deal.rentSource || "estimated (treat as indicative)",
      epc: deal.epc || "unknown (treat as upgrade risk)",
      crime: deal.crime || "unknown",
      flood: deal.flood || "unknown",
    };

    const prompt = `You are an experienced UK property investment analyst. Generate a crisp, actionable summary.

**Inputs:**
- Address: ${inputs.address}
- Price: £${inputs.price}
- Monthly Rent: £${inputs.rent} (source: ${inputs.rentSource})
- Gross Yield: ${inputs.grossYield}%
- Net Yield: ${inputs.netYield}%
- ROI: ${inputs.roi}%
- Monthly Cashflow: £${inputs.cashFlow}
- DSCR: ${inputs.dscr}
- EPC: ${inputs.epc}
- Crime: ${inputs.crime}
- Flood: ${inputs.flood}

**Task:**
Identify exactly 3 DRIVERS (positive factors) and 3 RISKS (concerns).
- Each must be 1 line max (~10-15 words)
- Investor-friendly, direct tone
- No disclaimers like "not financial advice" - focus on facts
- If data is missing (e.g., EPC: unknown), include it as a risk with wording like "EPC: unknown (treat as upgrade risk)"

**Output format (JSON only, no markdown):**
{
  "drivers": ["<driver 1>", "<driver 2>", "<driver 3>"],
  "risks": ["<risk 1>", "<risk 2>", "<risk 3>"]
}

Return ONLY the JSON object.`;

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
                "You are a UK property investment analyst. Return only valid JSON with drivers and risks arrays. No markdown, no extra text.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      // Fall back to heuristic summary on AI failure
      console.log("Falling back to heuristic summary");
      const heuristicSummary = generateHeuristicSummary(deal);
      return new Response(
        JSON.stringify({ success: true, summary: heuristicSummary, source: "heuristic" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;

    console.log("AI response:", aiContent);

    let summary;
    try {
      // Extract JSON from response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate schema
      if (!validateSchema(parsed)) {
        console.error("Schema validation failed:", parsed);
        throw new Error("Invalid schema");
      }
      
      summary = parsed;
      console.log("AI summary validated:", summary);
    } catch (parseError) {
      console.error("Failed to parse/validate AI response:", aiContent, parseError);
      // Fallback to heuristic summary
      console.log("Falling back to heuristic summary");
      summary = generateHeuristicSummary(deal);
      
      return new Response(
        JSON.stringify({ success: true, summary, source: "heuristic" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, summary, source: "ai" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-deal-summary function:", error);
    
    // Final fallback to heuristic summary on any error
    try {
      const { deal } = await req.json();
      const heuristicSummary = generateHeuristicSummary(deal);
      return new Response(
        JSON.stringify({ success: true, summary: heuristicSummary, source: "heuristic_fallback" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch {
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
  }
});
