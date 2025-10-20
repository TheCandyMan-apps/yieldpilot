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
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profile and check subscription tier
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_tier, analyses_count")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return new Response(
        JSON.stringify({ error: "Unable to verify account status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      analysisId,
      propertyAddress,
      propertyPrice,
      propertyType,
      estimatedRent,
      mortgageRate,
      depositAmount,
      monthlyCosts,
    } = await req.json();

    // Input validation
    if (!propertyAddress || typeof propertyAddress !== "string" || propertyAddress.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Property address is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (propertyAddress.length > 500) {
      return new Response(
        JSON.stringify({ error: "Property address is too long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const numericFields = {
      propertyPrice: { value: propertyPrice, min: 1000, max: 100000000, name: "Property price" },
      estimatedRent: { value: estimatedRent, min: 0, max: 1000000, name: "Estimated rent" },
      mortgageRate: { value: mortgageRate, min: 0, max: 20, name: "Mortgage rate" },
      depositAmount: { value: depositAmount, min: 0, max: propertyPrice, name: "Deposit amount" },
      monthlyCosts: { value: monthlyCosts, min: 0, max: 100000, name: "Monthly costs" },
    };

    for (const [key, field] of Object.entries(numericFields)) {
      const num = parseFloat(field.value);
      if (isNaN(num) || num < field.min || num > field.max) {
        return new Response(
          JSON.stringify({ error: `${field.name} must be between ${field.min} and ${field.max}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check subscription tier limits (only for new analyses)
    if (!analysisId) {
      const tierLimits: Record<string, number> = {
        free: 10,
        pro: 100,
        investor: 500,
        agency: -1, // unlimited
      };

      const limit = tierLimits[profile.subscription_tier] || tierLimits.free;
      
      if (limit !== -1 && profile.analyses_count >= limit) {
        return new Response(
          JSON.stringify({ 
            error: "Monthly analysis limit reached. Please upgrade your subscription to continue.",
            limit: limit,
            used: profile.analyses_count
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("Analyzing property for user:", user.id);

    // Create or update the analysis record
    let analysis;
    
    if (analysisId) {
      // Update existing analysis
      const { data: updatedAnalysis, error: updateError } = await supabase
        .from("property_analyses")
        .update({
          property_address: propertyAddress,
          property_price: propertyPrice,
          property_type: propertyType,
          estimated_rent: estimatedRent,
          mortgage_rate: mortgageRate,
          deposit_amount: depositAmount,
          monthly_costs: monthlyCosts,
          analysis_status: "pending",
        })
        .eq("id", analysisId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (updateError) {
        console.error("Update error:", updateError);
        throw updateError;
      }
      analysis = updatedAnalysis;
    } else {
      // Create new analysis
      const { data: newAnalysis, error: insertError } = await supabase
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
      analysis = newAnalysis;
    }

    // Comprehensive sanitization to prevent AI prompt injection
    let sanitizedAddress = propertyAddress.trim();
    
    // 1. Strip control characters (newlines, tabs, etc.)
    sanitizedAddress = sanitizedAddress.replace(/[\n\r\t\f\v\u0000-\u001F\u007F-\u009F]/g, ' ');
    
    // 2. Remove Unicode directional overrides and other problematic characters
    sanitizedAddress = sanitizedAddress.replace(/[\u202A-\u202E\u2066-\u2069]/g, '');
    
    // 3. Detect prompt injection keywords
    const injectionKeywords = ['ignore', 'override', 'system', 'assistant', 'instructions', 'prompt', 'role'];
    const lowerAddress = sanitizedAddress.toLowerCase();
    for (const keyword of injectionKeywords) {
      if (lowerAddress.includes(keyword)) {
        return new Response(
          JSON.stringify({ error: "Property address contains invalid characters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    
    // 4. Apply allowlist for safe characters (alphanumeric, spaces, basic punctuation)
    sanitizedAddress = sanitizedAddress.replace(/[^a-zA-Z0-9\s,.\-#']/g, '');
    
    // 5. Collapse multiple spaces and limit length
    sanitizedAddress = sanitizedAddress.replace(/\s+/g, ' ').substring(0, 200);
    
    // Call AI for analysis
    const aiPrompt = `You are a property investment analyst. Analyze this property deal and provide detailed investment insights.

Property Details:
- Address: ${sanitizedAddress}
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
      console.error("AI response error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "AI service rate limit reached. We're processing too many requests right now. Please wait 1 minute and try again.",
            retryAfter: 60
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: "AI service credit limit reached. Please contact support@yieldpilot.com to restore service or add credits to your workspace.",
            supportEmail: "support@yieldpilot.com"
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Unable to complete analysis at this time" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    // Increment user's analysis count only for new analyses
    if (!analysisId) {
      await supabase.rpc("increment", {
        row_id: user.id,
        x: 1,
      }).select();
    }

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
    
    // Generic error message for client, detailed logging on server
    let clientMessage = "An error occurred while processing your request";
    let statusCode = 500;
    
    if (error instanceof Error) {
      // Map specific error types to user-friendly messages
      if (error.message.includes("JSON")) {
        clientMessage = "Invalid data format received";
        statusCode = 400;
      } else if (error.message.includes("auth")) {
        clientMessage = "Authentication required";
        statusCode = 401;
      }
    }
    
    return new Response(
      JSON.stringify({ error: clientMessage }),
      {
        status: statusCode,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});