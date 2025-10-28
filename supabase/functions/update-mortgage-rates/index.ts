import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sample mortgage rates (in production, these would come from real APIs)
const SAMPLE_RATES = [
  // UK
  { region: 'UK', lender: 'HSBC', product_type: '2-Year Fixed', ltv_max: 75, interest_rate: 5.49, term_years: 25, fees: { arrangement: 999 } },
  { region: 'UK', lender: 'Nationwide', product_type: '5-Year Fixed', ltv_max: 80, interest_rate: 5.24, term_years: 25, fees: { arrangement: 1499 } },
  { region: 'UK', lender: 'Barclays', product_type: 'Tracker', ltv_max: 75, interest_rate: 6.19, term_years: 25, fees: { arrangement: 0 } },
  
  // US
  { region: 'US', lender: 'Chase', product_type: '30-Year Fixed', ltv_max: 80, interest_rate: 7.12, term_years: 30, fees: { origination: 2000 } },
  { region: 'US', lender: 'Wells Fargo', product_type: '15-Year Fixed', ltv_max: 75, interest_rate: 6.38, term_years: 15, fees: { origination: 1500 } },
  { region: 'US', lender: 'Bank of America', product_type: '5/1 ARM', ltv_max: 80, interest_rate: 6.75, term_years: 30, fees: { origination: 1800 } },
  
  // DE
  { region: 'DE', lender: 'Deutsche Bank', product_type: '10-Year Fixed', ltv_max: 80, interest_rate: 3.95, term_years: 30, fees: { arrangement: 0 } },
  { region: 'DE', lender: 'Commerzbank', product_type: '15-Year Fixed', ltv_max: 70, interest_rate: 4.15, term_years: 30, fees: { arrangement: 0 } },
  
  // FR
  { region: 'FR', lender: 'BNP Paribas', product_type: '20-Year Fixed', ltv_max: 80, interest_rate: 4.10, term_years: 20, fees: { arrangement: 0 } },
  { region: 'FR', lender: 'Crédit Agricole', product_type: '25-Year Fixed', ltv_max: 85, interest_rate: 4.35, term_years: 25, fees: { arrangement: 0 } },
  
  // ES
  { region: 'ES', lender: 'Santander', product_type: 'Variable', ltv_max: 80, interest_rate: 3.50, term_years: 30, fees: { arrangement: 0 } },
  { region: 'ES', lender: 'BBVA', product_type: '10-Year Fixed', ltv_max: 70, interest_rate: 3.75, term_years: 30, fees: { arrangement: 600 } },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Updating mortgage rates...');

    // Deactivate old rates
    await supabaseClient
      .from('mortgage_rates')
      .update({ is_active: false })
      .eq('is_active', true);

    // Insert new rates
    const { data, error } = await supabaseClient
      .from('mortgage_rates')
      .insert(SAMPLE_RATES.map(rate => ({
        ...rate,
        is_active: true,
        updated_at: new Date().toISOString(),
      })))
      .select();

    if (error) throw error;

    console.log(`Updated ${data?.length || 0} mortgage rates`);

    return new Response(JSON.stringify({ 
      success: true, 
      updated: data?.length || 0,
      rates: data 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Mortgage rates update error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
