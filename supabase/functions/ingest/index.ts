import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { ukRightmoveProvider } from './providers/uk-rightmove.ts';
import { usRealtorProvider } from './providers/us-realtor.ts';
import { esIdealistaProvider } from './providers/es-idealista.ts';
import { ProviderInterface, NormalizedListing } from './providers/types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROVIDERS: Record<string, ProviderInterface> = {
  'uk.rightmove': ukRightmoveProvider,
  'us.realtor': usRealtorProvider,
  'es.idealista': esIdealistaProvider,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { provider, since } = await req.json();

    if (!provider || !PROVIDERS[provider]) {
      return new Response(
        JSON.stringify({ error: 'Invalid provider. Must be one of: uk.rightmove, us.realtor, es.idealista' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const startTime = Date.now();
    console.log(`[ingest] Starting ${provider} ingestion...`);

    // Fetch batch from provider
    const listings = await PROVIDERS[provider].fetchBatch(since);
    console.log(`[ingest] Fetched ${listings.length} listings from ${provider}`);

    let insertedCount = 0;
    let errorCount = 0;

    // Upsert each listing
    for (const listing of listings) {
      try {
        const { error } = await supabase
          .from('listings')
          .upsert(
            {
              source: listing.source,
              source_listing_id: listing.source_listing_id,
              listing_url: listing.listing_url,
              images: listing.images || [],
              country: listing.country,
              region: listing.region,
              city: listing.city,
              postcode: listing.postcode,
              address: listing.address,
              latitude: listing.latitude,
              longitude: listing.longitude,
              property_type: listing.property_type,
              tenure: listing.tenure,
              beds: listing.beds,
              baths: listing.baths,
              floor_area_m2: listing.floor_area_m2,
              lot_area_m2: listing.lot_area_m2,
              year_built: listing.year_built,
              price: listing.price,
              currency: listing.currency,
              is_active: listing.is_active ?? true,
              days_on_market: listing.days_on_market,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'source,source_listing_id' }
          );

        if (error) {
          console.error(`[ingest] Error upserting listing ${listing.source_listing_id}:`, error);
          errorCount++;
        } else {
          insertedCount++;
        }
      } catch (err) {
        console.error(`[ingest] Exception upserting listing:`, err);
        errorCount++;
      }
    }

    const duration = Date.now() - startTime;

    // Log to audit table
    const { error: auditError } = await supabase.from('ingest_audit').insert({
      provider,
      count: insertedCount,
      duration_ms: duration,
      fetched_at: new Date().toISOString(),
      error_message: errorCount > 0 ? `${errorCount} errors occurred` : null,
    });

    if (auditError) {
      console.error('[ingest] Error logging audit:', auditError);
    }

    console.log(`[ingest] Completed in ${duration}ms. Inserted: ${insertedCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        provider,
        count: insertedCount,
        errors: errorCount,
        duration_ms: duration,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[ingest] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
