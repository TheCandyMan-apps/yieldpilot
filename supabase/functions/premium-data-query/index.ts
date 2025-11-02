import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { PremiumDataQuerySchema, validateInput } from "../_shared/validation.ts";
import { createErrorResponse, createAuthError, createValidationError } from "../_shared/error-handler.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[PREMIUM-DATA-QUERY] ${step}`, details ? JSON.stringify(details) : '');
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
    if (!authHeader) {
      return createAuthError('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      return createAuthError('Invalid authentication token');
    }
    
    const user = userData.user;
    if (!user) {
      return createAuthError('User not authenticated');
    }
    logStep('User authenticated', { userId: user.id });

    // Parse and validate input
    const body = await req.json();
    const validation = validateInput(PremiumDataQuerySchema, body);
    
    if (!validation.success) {
      logStep('Validation failed', { error: validation.error });
      return createValidationError(validation.error);
    }

    const { listing_id, query_type } = validation.data;
    logStep('Query parameters validated', { listing_id, query_type });

    // Check user's premium credits
    const { data: credits, error: creditsError } = await supabaseClient
      .from('premium_credits')
      .select('*')
      .eq('user_id', user.id)
      .eq('credit_type', 'premium_data')
      .gte('period_end', new Date().toISOString())
      .gt('credits_remaining', 0)
      .order('period_end', { ascending: true })
      .limit(1)
      .single();

    if (creditsError && creditsError.code !== 'PGRST116') {
      logStep('Error checking credits', { error: creditsError });
      throw new Error('Failed to check premium credits');
    }

    if (!credits || credits.credits_remaining < 1) {
      logStep('Insufficient credits');
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient premium data credits',
          requires_upgrade: true,
          credits_remaining: credits?.credits_remaining || 0
        }),
        { 
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    logStep('Credits available', { remaining: credits.credits_remaining });

    // Get listing details
    const { data: listing, error: listingError } = await supabaseClient
      .from('listings')
      .select('*')
      .eq('id', listing_id)
      .single();

    if (listingError) throw new Error('Listing not found');

    // Mock premium data (in production, integrate with real APIs)
    const premiumData = await fetchPremiumData(query_type, listing);

    // Deduct credit
    const { error: updateError } = await supabaseClient
      .from('premium_credits')
      .update({ 
        credits_remaining: credits.credits_remaining - 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', credits.id);

    if (updateError) {
      logStep('Error updating credits', { error: updateError });
      throw new Error('Failed to deduct credit');
    }

    // Log the query
    const { error: logError } = await supabaseClient
      .from('premium_data_queries')
      .insert({
        user_id: user.id,
        listing_id,
        query_type,
        credits_used: 1,
        data_result: premiumData
      });

    if (logError) {
      logStep('Error logging query', { error: logError });
    }

    logStep('Query successful', { query_type, credits_remaining: credits.credits_remaining - 1 });

    return new Response(
      JSON.stringify({
        success: true,
        data: premiumData,
        credits_remaining: credits.credits_remaining - 1
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logStep('ERROR', { message: error instanceof Error ? error.message : String(error) });
    return createErrorResponse(error, 500, 'ERR_PREMIUM_QUERY_FAILED');
  }
});

async function fetchPremiumData(queryType: string, listing: any) {
  // Mock data - in production, integrate with:
  // - Land Registry API for ownership
  // - OS Data Hub for zoning
  // - ONS for demographics
  // - Planning Portal API for planning apps
  
  const baseData = {
    address: listing.address_line1,
    postcode: listing.postcode,
    query_type: queryType,
    fetched_at: new Date().toISOString()
  };

  switch (queryType) {
    case 'ownership':
      return {
        ...baseData,
        title_number: `TN${Math.floor(Math.random() * 1000000)}`,
        owner_type: 'Private Individual',
        tenure: listing.tenure || 'Freehold',
        purchase_price: listing.price * 0.85,
        purchase_date: '2020-03-15',
        mortgage_details: {
          has_mortgage: true,
          lender: 'Sample Bank Ltd',
          outstanding_estimated: listing.price * 0.6
        }
      };
    
    case 'zoning':
      return {
        ...baseData,
        current_use_class: 'C3 - Residential',
        permitted_uses: ['Residential dwelling', 'Home office'],
        restrictions: ['Green belt adjacent', 'Conservation area'],
        future_developments: [
          { type: 'Transport link', distance: '0.5 miles', status: 'Approved' }
        ]
      };
    
    case 'demographics':
      return {
        ...baseData,
        area_stats: {
          median_income: 35000,
          population_growth_5yr: 8.5,
          avg_age: 36,
          employment_rate: 94.2,
          crime_rate: 'Low',
          school_rating: 'Good'
        },
        market_demand: {
          rental_demand: 'High',
          buyer_demand: 'Moderate',
          days_to_let_avg: 12,
          days_to_sell_avg: 45
        }
      };
    
    case 'planning':
      return {
        ...baseData,
        planning_history: [
          {
            reference: `20/00${Math.floor(Math.random() * 9999)}/FUL`,
            description: 'Single storey rear extension',
            status: 'Approved',
            decision_date: '2022-06-12'
          }
        ],
        nearby_applications: [
          {
            reference: `21/00${Math.floor(Math.random() * 9999)}/FUL`,
            description: 'New residential development - 12 units',
            distance: '0.3 miles',
            status: 'Under consideration'
          }
        ],
        constraints: ['Tree preservation order nearby']
      };
    
    default:
      return baseData;
  }
}
