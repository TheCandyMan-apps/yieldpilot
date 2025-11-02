import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[ANALYZE-PORTFOLIO] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Function started');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;
    
    const user = userData.user;
    if (!user) throw new Error('User not authenticated');
    logStep('User authenticated', { userId: user.id });

    const { portfolio_id } = await req.json();
    if (!portfolio_id) throw new Error('portfolio_id is required');

    // Verify portfolio ownership
    const { data: portfolio, error: portfolioError } = await supabaseClient
      .from('portfolios')
      .select('*')
      .eq('id', portfolio_id)
      .eq('user_id', user.id)
      .single();

    if (portfolioError) throw new Error('Portfolio not found or access denied');
    logStep('Portfolio verified', { portfolioId: portfolio_id });

    // Get portfolio items with listings and metrics
    const { data: items, error: itemsError } = await supabaseClient
      .from('portfolio_items')
      .select(`
        *,
        listing:listings(
          *,
          listing_metrics(*)
        )
      `)
      .eq('portfolio_id', portfolio_id);

    if (itemsError) throw itemsError;
    logStep('Portfolio items fetched', { count: items?.length || 0 });

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Portfolio is empty',
          portfolio_id 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Calculate advanced metrics
    const metrics = calculatePortfolioMetrics(items);
    logStep('Metrics calculated', metrics);

    // Save metrics to database
    const { error: saveError } = await supabaseClient
      .from('portfolio_metrics')
      .insert({
        portfolio_id,
        ...metrics
      });

    if (saveError) {
      logStep('Error saving metrics', { error: saveError });
    }

    return new Response(
      JSON.stringify({
        success: true,
        portfolio_id,
        metrics
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR', { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function calculatePortfolioMetrics(items: any[]) {
  let totalValue = 0;
  let totalRent = 0;
  let weightedYield = 0;
  const geographicConcentration: Record<string, number> = {};
  const propertyTypeMix: Record<string, number> = {};
  const riskFactors: string[] = [];

  items.forEach(item => {
    const listing = item.listing;
    if (!listing) return;

    const value = listing.price || 0;
    totalValue += value;

    // Rent and yield
    const rent = listing.estimated_rent || 0;
    totalRent += rent;
    const yieldPct = listing.listing_metrics?.[0]?.gross_yield_pct || 0;
    weightedYield += (yieldPct * value);

    // Geographic concentration
    const region = listing.region || listing.city || 'Unknown';
    geographicConcentration[region] = (geographicConcentration[region] || 0) + value;

    // Property type mix
    const propType = listing.property_type || 'Unknown';
    propertyTypeMix[propType] = (propertyTypeMix[propType] || 0) + 1;
  });

  // Average yield
  const avgYield = totalValue > 0 ? weightedYield / totalValue : 0;

  // Diversification score (0-100)
  const uniqueRegions = Object.keys(geographicConcentration).length;
  const uniqueTypes = Object.keys(propertyTypeMix).length;
  const diversificationScore = Math.min(100, (uniqueRegions * 15) + (uniqueTypes * 20) + 10);

  // Risk score calculation
  let riskScore = 50; // Base risk

  // Geographic concentration risk
  const maxRegionConcentration = Math.max(...Object.values(geographicConcentration)) / totalValue;
  if (maxRegionConcentration > 0.7) {
    riskScore += 20;
    riskFactors.push('High geographic concentration');
  } else if (maxRegionConcentration > 0.5) {
    riskScore += 10;
  }

  // Low yield risk
  if (avgYield < 4) {
    riskScore += 15;
    riskFactors.push('Below-market yields');
  }

  // Property type concentration
  const maxTypeConcentration = Math.max(...Object.values(propertyTypeMix)) / items.length;
  if (maxTypeConcentration > 0.8) {
    riskScore += 15;
    riskFactors.push('Limited property type diversity');
  }

  riskScore = Math.min(100, Math.max(0, riskScore));

  // Generate recommendations
  const recommendations = [];
  if (uniqueRegions < 3) {
    recommendations.push({
      type: 'diversification',
      priority: 'high',
      message: 'Consider expanding to additional geographic regions to reduce concentration risk'
    });
  }
  if (avgYield < 5) {
    recommendations.push({
      type: 'yield',
      priority: 'medium',
      message: 'Portfolio yield is below market average. Consider higher-yielding opportunities'
    });
  }
  if (uniqueTypes < 2) {
    recommendations.push({
      type: 'property_mix',
      priority: 'medium',
      message: 'Diversify property types (residential, commercial, HMO) to balance risk'
    });
  }

  // Normalize geographic concentration to percentages
  const geoConcentrationPct: Record<string, number> = {};
  Object.entries(geographicConcentration).forEach(([region, value]) => {
    geoConcentrationPct[region] = Math.round((value / totalValue) * 100);
  });

  return {
    total_value: Math.round(totalValue * 100) / 100,
    total_equity: Math.round(totalValue * 0.3 * 100) / 100, // Assume 30% avg equity
    total_debt: Math.round(totalValue * 0.7 * 100) / 100, // Assume 70% avg debt
    avg_yield: Math.round(avgYield * 100) / 100,
    diversification_score: diversificationScore,
    risk_score: riskScore,
    geographic_concentration: geoConcentrationPct,
    property_type_mix: propertyTypeMix,
    recommendations
  };
}
