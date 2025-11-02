import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[CREATE-REFERRAL] ${step}`, details ? JSON.stringify(details) : '');
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

    const { provider_id, listing_id, referral_type, notes } = await req.json();
    
    if (!provider_id || !referral_type) {
      throw new Error('provider_id and referral_type are required');
    }

    // Verify provider exists
    const { data: provider, error: providerError } = await supabaseClient
      .from('service_providers')
      .select('*')
      .eq('id', provider_id)
      .single();

    if (providerError) throw new Error('Service provider not found');

    logStep('Provider verified', { providerId: provider_id, providerType: provider.provider_type });

    // Calculate commission
    let commissionAmount = 0;
    let userRebateAmount = 0;

    if (listing_id) {
      const { data: listing } = await supabaseClient
        .from('listings')
        .select('price')
        .eq('id', listing_id)
        .single();

      if (listing && provider.commission_rate) {
        commissionAmount = (listing.price * provider.commission_rate) / 100;
        
        // User rebate based on subscription tier (simplified)
        // Pro users get 20% rebate, others 10%
        userRebateAmount = commissionAmount * 0.10;
      }
    }

    // Create referral
    const { data: referral, error: referralError } = await supabaseClient
      .from('referrals')
      .insert({
        user_id: user.id,
        provider_id,
        listing_id,
        referral_type,
        status: 'pending',
        commission_amount: commissionAmount > 0 ? commissionAmount : null,
        user_rebate_amount: userRebateAmount > 0 ? userRebateAmount : null,
        notes
      })
      .select()
      .single();

    if (referralError) throw referralError;

    logStep('Referral created', { 
      referralId: referral.id, 
      commission: commissionAmount,
      rebate: userRebateAmount 
    });

    return new Response(
      JSON.stringify({
        success: true,
        referral: {
          ...referral,
          provider: {
            company_name: provider.company_name,
            contact_name: provider.contact_name,
            email: provider.email,
            phone: provider.phone
          }
        }
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
