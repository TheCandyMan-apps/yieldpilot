import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[MARKETPLACE-MATCH] ${step}`, details ? JSON.stringify(details) : '');
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

    const { provider_type, region, listing_id } = await req.json();
    
    if (!provider_type) {
      throw new Error('provider_type is required');
    }

    const validTypes = ['broker', 'property_manager', 'mortgage_broker', 'solicitor', 'contractor'];
    if (!validTypes.includes(provider_type)) {
      throw new Error(`Invalid provider_type. Must be one of: ${validTypes.join(', ')}`);
    }

    logStep('Matching criteria', { provider_type, region, listing_id });

    // Build query for service providers
    let query = supabaseClient
      .from('service_providers')
      .select('*')
      .eq('provider_type', provider_type)
      .eq('is_active', true)
      .eq('is_verified', true);

    // Filter by region if provided
    if (region) {
      query = query.contains('regions', [region]);
    }

    // Order by rating and listing tier
    query = query.order('listing_tier', { ascending: false })
                 .order('rating', { ascending: false })
                 .limit(10);

    const { data: providers, error: providersError } = await query;

    if (providersError) throw providersError;

    logStep('Providers matched', { count: providers?.length || 0 });

    // Calculate match scores
    const scoredProviders = (providers || []).map(provider => {
      let score = 70; // Base score

      // Rating bonus
      if (provider.rating) {
        score += provider.rating * 4; // Up to +20 for 5-star rating
      }

      // Listing tier bonus
      if (provider.listing_tier === 'premium') score += 10;
      else if (provider.listing_tier === 'featured') score += 5;

      // Region match bonus
      if (region && provider.regions.includes(region)) {
        score += 10;
      }

      return {
        ...provider,
        match_score: Math.min(100, score)
      };
    });

    // Sort by match score
    scoredProviders.sort((a, b) => b.match_score - a.match_score);

    return new Response(
      JSON.stringify({
        success: true,
        provider_type,
        region,
        providers: scoredProviders,
        total_matches: scoredProviders.length
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
