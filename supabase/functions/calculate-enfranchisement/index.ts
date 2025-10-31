import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnfranchisementRequest {
  propertyValue: number;
  yearsRemaining: number;
  groundRentAnnual: number;
  isFlat: boolean;
  shareOfFreehold?: boolean;
}

function calculateEnfranchisement(params: EnfranchisementRequest) {
  const { propertyValue, yearsRemaining, groundRentAnnual, isFlat, shareOfFreehold } = params;

  // Base calculation factors
  const marriageValue = yearsRemaining < 80 ? propertyValue * 0.5 : 0;
  const freeholdValue = propertyValue * 0.05;
  
  // Ground rent capitalization (using 7% yield)
  const capitalizedGroundRent = yearsRemaining > 0 
    ? (groundRentAnnual / 0.07) * (1 - Math.pow(1.07, -yearsRemaining))
    : 0;

  // Reversion value (property value at lease end, discounted)
  const reversionValue = yearsRemaining < 80 
    ? freeholdValue / Math.pow(1.07, yearsRemaining)
    : 0;

  // Total enfranchisement cost
  let enfranchisementCost = capitalizedGroundRent + reversionValue + marriageValue;

  // Add professional fees (10-15%)
  const professionalFees = enfranchisementCost * 0.125;
  const landlordCosts = enfranchisementCost * 0.05;
  const totalCost = enfranchisementCost + professionalFees + landlordCosts;

  // Lease extension cost (simpler calculation)
  const extensionPremium = yearsRemaining < 80 
    ? (marriageValue * 0.5) + capitalizedGroundRent 
    : capitalizedGroundRent * 0.8;
  
  const extensionFees = extensionPremium * 0.1;
  const totalExtensionCost = extensionPremium + extensionFees;

  // Value uplift calculations
  const currentMarketValue = propertyValue * (yearsRemaining < 80 ? 0.85 : 0.95);
  const freehold_value = propertyValue;
  const valueUplift = freehold_value - currentMarketValue;
  const netGain = valueUplift - totalCost;
  const roi = (netGain / totalCost) * 100;

  // Share of freehold adjustment (if applicable)
  const shareOfFreeholdCost = shareOfFreehold ? totalCost / 2 : null;

  return {
    enfranchisementCost: Math.round(totalCost),
    breakdown: {
      capitalizedGroundRent: Math.round(capitalizedGroundRent),
      reversionValue: Math.round(reversionValue),
      marriageValue: Math.round(marriageValue),
      professionalFees: Math.round(professionalFees),
      landlordCosts: Math.round(landlordCosts),
    },
    leaseExtensionCost: Math.round(totalExtensionCost),
    extensionBreakdown: {
      premium: Math.round(extensionPremium),
      fees: Math.round(extensionFees),
    },
    valueAnalysis: {
      currentMarketValue: Math.round(currentMarketValue),
      freeholdValue: Math.round(freehold_value),
      valueUplift: Math.round(valueUplift),
      netGain: Math.round(netGain),
      roi: Math.round(roi * 10) / 10,
    },
    shareOfFreeholdCost: shareOfFreeholdCost ? Math.round(shareOfFreeholdCost) : null,
    recommendation: roi > 15 ? 'highly_recommended' : roi > 5 ? 'recommended' : 'consider_carefully',
    urgency: yearsRemaining < 85 ? 'high' : yearsRemaining < 95 ? 'medium' : 'low',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body = await req.json();
    const result = calculateEnfranchisement(body);

    // Optionally save to database if property_id provided
    if (body.property_id) {
      await supabase
        .from('lease_roi_metrics')
        .update({
          estimated_enfranchisement_cost: result.enfranchisementCost,
          lease_extension_cost_estimate: result.leaseExtensionCost,
          enfranchisement_eligible: true,
          updated_at: new Date().toISOString(),
        })
        .eq('property_id', body.property_id);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Enfranchisement calculation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
