import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { scanJobId, documentText } = await req.json();

    console.log(`[SCAN-LEASE] Processing scan job: ${scanJobId}`);

    // Update job status to processing
    await supabaseClient
      .from("lease_scan_jobs")
      .update({ status: "processing" })
      .eq("id", scanJobId);

    // AI prompt for lease extraction
    const extractionPrompt = `You are a UK property lease analysis expert. Analyze this lease document and extract key information.

Document text:
${documentText}

Extract the following information in JSON format:
{
  "lease_start_date": "YYYY-MM-DD or null",
  "lease_end_date": "YYYY-MM-DD or null",
  "years_remaining": number or null,
  "ground_rent_annual": number or null,
  "ground_rent_review_period": number (years) or null,
  "ground_rent_escalation_type": "fixed" | "rpi" | "doubling" | "custom" | null,
  "service_charge_annual": number or null,
  "subletting_allowed": boolean,
  "subletting_restrictions": "string describing restrictions or null",
  "pet_clause": "string describing pet policy or null",
  "alteration_restrictions": "string describing alteration restrictions or null",
  "use_restrictions": "string describing use restrictions or null",
  "insurance_responsibility": "landlord" | "tenant" | "shared" | null,
  "repair_obligations": "string describing repair obligations or null",
  "key_risk_factors": ["array of identified risk factors"]
}

Focus on accuracy. If information is not found, use null. Be precise with dates and numbers.`;

    // Call Lovable AI for extraction
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a lease document extraction specialist. Return only valid JSON." },
          { role: "user", content: extractionPrompt }
        ],
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[SCAN-LEASE] AI API error:", errorText);
      throw new Error(`AI extraction failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const extractedContent = aiData.choices[0].message.content;
    
    // Parse JSON from AI response
    const jsonMatch = extractedContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to extract JSON from AI response");
    }
    
    const extractedData = JSON.parse(jsonMatch[0]);
    console.log("[SCAN-LEASE] Extracted data:", extractedData);

    // Get scan job details
    const { data: scanJob } = await supabaseClient
      .from("lease_scan_jobs")
      .select("property_id")
      .eq("id", scanJobId)
      .single();

    // Insert lease terms
    const { data: leaseTerms, error: termsError } = await supabaseClient
      .from("lease_terms")
      .insert({
        scan_job_id: scanJobId,
        property_id: scanJob?.property_id,
        user_id: user.id,
        ...extractedData,
        raw_extracted_data: extractedData,
      })
      .select()
      .single();

    if (termsError) {
      console.error("[SCAN-LEASE] Error inserting lease terms:", termsError);
      throw termsError;
    }

    console.log("[SCAN-LEASE] Lease terms inserted:", leaseTerms.id);

    // Calculate risk scores
    const riskScores = calculateRiskScores(extractedData);
    
    // Generate risk flags
    const riskFlags = generateRiskFlags(extractedData, leaseTerms.id);
    
    // Insert risk flags
    if (riskFlags.length > 0) {
      await supabaseClient.from("lease_risk_flags").insert(riskFlags);
    }

    // Generate forecasts
    const groundRentForecast = generateGroundRentForecast(extractedData);
    const serviceChargeForecast = generateServiceChargeForecast(extractedData);

    // Insert risk metrics
    const { data: metrics } = await supabaseClient
      .from("lease_roi_metrics")
      .insert({
        lease_term_id: leaseTerms.id,
        property_id: scanJob?.property_id,
        ...riskScores,
        ground_rent_forecast: groundRentForecast,
        service_charge_forecast: serviceChargeForecast,
      })
      .select()
      .single();

    // Update scan job status
    await supabaseClient
      .from("lease_scan_jobs")
      .update({ status: "completed" })
      .eq("id", scanJobId);

    return new Response(
      JSON.stringify({
        success: true,
        leaseTermsId: leaseTerms.id,
        metricsId: metrics?.id,
        riskScore: riskScores.overall_risk_score,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[SCAN-LEASE] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// Risk scoring algorithm
function calculateRiskScores(data: any) {
  let groundRentRisk = 0;
  let leaseLengthRisk = 0;
  let restrictionsRisk = 0;
  let mortgageabilityRisk = 0;
  let serviceChargeRisk = 0;

  // Ground rent risk
  if (data.ground_rent_annual > 1000) groundRentRisk += 40;
  else if (data.ground_rent_annual > 500) groundRentRisk += 20;
  
  if (data.ground_rent_escalation_type === "doubling") groundRentRisk += 50;
  else if (data.ground_rent_escalation_type === "rpi") groundRentRisk += 20;

  // Lease length risk
  if (data.years_remaining < 80) leaseLengthRisk += 60;
  else if (data.years_remaining < 90) leaseLengthRisk += 30;
  else if (data.years_remaining < 100) leaseLengthRisk += 10;

  // Restrictions risk
  if (!data.subletting_allowed) restrictionsRisk += 30;
  if (data.alteration_restrictions?.includes("prohibited")) restrictionsRisk += 20;
  if (data.use_restrictions?.includes("residential only")) restrictionsRisk += 10;

  // Mortgageability risk
  const isMortgageable = data.years_remaining >= 80 && data.ground_rent_annual < 1000;
  mortgageabilityRisk = isMortgageable ? 0 : 80;

  // Service charge risk
  if (data.service_charge_annual > 5000) serviceChargeRisk += 40;
  else if (data.service_charge_annual > 3000) serviceChargeRisk += 20;

  // Calculate overall score
  const avgRisk = (groundRentRisk + leaseLengthRisk + restrictionsRisk + mortgageabilityRisk + serviceChargeRisk) / 5;
  const riskScoreNumeric = Math.min(100, Math.round(avgRisk));
  
  let overallRiskScore = "A";
  if (riskScoreNumeric >= 80) overallRiskScore = "F";
  else if (riskScoreNumeric >= 65) overallRiskScore = "E";
  else if (riskScoreNumeric >= 50) overallRiskScore = "D";
  else if (riskScoreNumeric >= 35) overallRiskScore = "C";
  else if (riskScoreNumeric >= 20) overallRiskScore = "B";

  return {
    overall_risk_score: overallRiskScore,
    risk_score_numeric: riskScoreNumeric,
    ground_rent_risk_score: groundRentRisk,
    lease_length_risk_score: leaseLengthRisk,
    restrictions_risk_score: restrictionsRisk,
    mortgageability_risk_score: mortgageabilityRisk,
    service_charge_risk_score: serviceChargeRisk,
    roi_adjustment_percentage: -(riskScoreNumeric * 0.15), // Risk reduces ROI
    is_mortgageable: isMortgageable,
    enfranchisement_eligible: data.years_remaining < 90,
  };
}

// Generate risk flags
function generateRiskFlags(data: any, leaseTermId: string) {
  const flags = [];

  if (data.years_remaining < 80) {
    flags.push({
      lease_term_id: leaseTermId,
      risk_type: "lease_length",
      severity: "critical",
      title: "Short Lease - Mortgageability Risk",
      description: `Lease has only ${data.years_remaining} years remaining. Most lenders require 80+ years.`,
      impact_on_value: -15,
      remediation_advice: "Consider lease extension before purchase. Costs typically £5,000-£15,000 plus legal fees.",
    });
  }

  if (data.ground_rent_escalation_type === "doubling") {
    flags.push({
      lease_term_id: leaseTermId,
      risk_type: "ground_rent",
      severity: "critical",
      title: "Doubling Ground Rent Clause",
      description: "Ground rent doubles periodically, creating exponential cost growth and mortgageability issues.",
      impact_on_value: -20,
      remediation_advice: "Negotiate ground rent buyout or lease variation. Essential before purchase.",
    });
  }

  if (data.ground_rent_annual > 1000) {
    flags.push({
      lease_term_id: leaseTermId,
      risk_type: "ground_rent",
      severity: "high",
      title: "High Ground Rent",
      description: `Ground rent of £${data.ground_rent_annual}/year exceeds £1,000 threshold for onerous leases.`,
      impact_on_value: -10,
      remediation_advice: "Negotiate reduction or factor into purchase price negotiations.",
    });
  }

  if (!data.subletting_allowed) {
    flags.push({
      lease_term_id: leaseTermId,
      risk_type: "restrictions",
      severity: "medium",
      title: "Subletting Prohibited",
      description: "Lease prohibits subletting, limiting exit strategy options and rental income potential.",
      impact_on_value: -5,
      remediation_advice: "Request lease variation from freeholder if buy-to-let intended.",
    });
  }

  if (data.service_charge_annual > 5000) {
    flags.push({
      lease_term_id: leaseTermId,
      risk_type: "service_charge",
      severity: "medium",
      title: "High Service Charge",
      description: `Annual service charge of £${data.service_charge_annual} significantly impacts cash flow.`,
      impact_on_value: -8,
      remediation_advice: "Review service charge accounts and challenge unreasonable costs via tribunal if needed.",
    });
  }

  return flags;
}

// Generate 10-year ground rent forecast
function generateGroundRentForecast(data: any) {
  const forecast = [];
  let currentRent = data.ground_rent_annual || 0;
  const reviewPeriod = data.ground_rent_review_period || 10;

  for (let year = 1; year <= 10; year++) {
    if (year % reviewPeriod === 0) {
      if (data.ground_rent_escalation_type === "doubling") {
        currentRent *= 2;
      } else if (data.ground_rent_escalation_type === "rpi") {
        currentRent *= 1.025; // Assume 2.5% RPI
      }
    }
    forecast.push({ year, amount: Math.round(currentRent * 100) / 100 });
  }

  return forecast;
}

// Generate 10-year service charge forecast
function generateServiceChargeForecast(data: any) {
  const forecast = [];
  let currentCharge = data.service_charge_annual || 0;

  for (let year = 1; year <= 10; year++) {
    currentCharge *= 1.03; // Assume 3% annual increase
    forecast.push({ year, amount: Math.round(currentCharge * 100) / 100 });
  }

  return forecast;
}
