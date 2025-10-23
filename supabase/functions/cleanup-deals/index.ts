import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting cleanup of mislabeled deals...');

    // Delete deals that are clearly London properties mislabeled as Leatherhead
    // (city='leatherhead' but address/postcode indicates London)
    const londonPostcodes = ['EC', 'WC', 'E', 'W', 'SE', 'SW', 'N', 'NW', 'NE'];
    
    const { data: mislabeledDeals, error: fetchError } = await supabase
      .from('deals_feed')
      .select('id, property_address, city, postcode, source')
      .eq('source', 'apify-zoopla')
      .ilike('city', 'leatherhead');

    if (fetchError) {
      console.error('Error fetching mislabeled deals:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${mislabeledDeals.length} potential mislabeled deals`);

    const toDelete: string[] = [];

    for (const deal of mislabeledDeals) {
      const address = (deal.property_address || '').toLowerCase();
      const postcode = (deal.postcode || '').toUpperCase().replace(/\s/g, '');
      
      // Check if address contains "london" or postcode starts with London prefixes
      const isLondon = address.includes('london') || 
        londonPostcodes.some(prefix => postcode.startsWith(prefix));
      
      // Check if postcode does NOT start with KT22
      const notKT22 = postcode && !postcode.startsWith('KT22');
      
      if (isLondon || notKT22) {
        toDelete.push(deal.id);
        console.log(`Marking for deletion: ${deal.property_address} (${deal.postcode})`);
      }
    }

    console.log(`Deleting ${toDelete.length} mislabeled deals...`);

    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('deals_feed')
        .delete()
        .in('id', toDelete);

      if (deleteError) {
        console.error('Error deleting deals:', deleteError);
        throw deleteError;
      }
    }

    console.log(`Cleanup complete. Deleted ${toDelete.length} mislabeled deals.`);

    return new Response(
      JSON.stringify({ 
        message: 'Cleanup complete',
        deletedCount: toDelete.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in cleanup-deals function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
