import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Provider registry
const PROVIDERS: Record<string, any> = {
  // UK providers
  'rightmove-uk': {
    actorId: 'shanes~rightmove-scraper',
    region: 'GB',
    normalize: (item: any) => ({
      country: 'GB',
      region: item.location?.county || 'England',
      city: item.location?.town || '',
      address_line1: item.displayAddress || item.address?.displayAddress || '',
      postcode: item.location?.outcode || '',
      location_lat: item.location?.latitude,
      location_lng: item.location?.longitude,
      price: item.price?.amount || item.price || 0,
      currency: 'GBP',
      bedrooms: item.bedrooms,
      bathrooms: item.bathrooms,
      property_type: item.propertySubType || item.propertyType || 'residential',
      estimated_rent: item.lettings?.monthlyPrice,
      images: item.propertyImages?.map((img: any) => img.srcUrl || img.url || img) || [],
      listing_url: item.propertyUrl || `https://www.rightmove.co.uk/properties/${item.id}`,
      source: 'rightmove',
      source_refs: { propertyId: item.id || item.propertyId },
    })
  },
  'zoopla-uk': {
    actorId: 'maxcopell~zoopla-scraper',
    region: 'GB',
    normalize: (item: any) => ({
      country: 'GB',
      region: item.county || 'England',
      city: item.town || item.county || '',
      address_line1: item.displayAddress || item.address || '',
      postcode: item.outcode || item.postcode || '',
      location_lat: item.location?.latitude,
      location_lng: item.location?.longitude,
      price: item.price || 0,
      currency: 'GBP',
      bedrooms: item.bedrooms,
      bathrooms: item.bathrooms,
      property_type: item.propertyType || item.propertySubType || 'residential',
      estimated_rent: item.rental?.monthlyPrice,
      images: item.images?.map((img: any) => img.url || img) || [],
      listing_url: item.detailsUrl || item.listingUrl || '',
      source: 'zoopla',
      source_refs: { listingId: item.listingId, propertyId: item.propertyId },
    })
  },
  // US providers
  'zillow-us': {
    actorId: 'maxcopell~zillow-scraper',
    region: 'US',
    normalize: (item: any) => {
      const address = item.address || {};
      return {
        country: 'US',
        region: address.state || '',
        city: address.city || '',
        address_line1: address.streetAddress || '',
        postcode: address.zipcode || '',
        location_lat: item.latitude,
        location_lng: item.longitude,
        price: item.price || item.unformattedPrice || 0,
        currency: 'USD',
        bedrooms: item.bedrooms,
        bathrooms: item.bathrooms,
        square_feet: item.livingArea,
        property_type: item.homeType || 'residential',
        estimated_rent: item.rentZestimate,
        images: item.photos?.map((url: string) => url) || [],
        listing_url: item.url || item.hdpUrl || '',
        source: 'zillow',
        source_refs: { zpid: item.zpid },
      };
    }
  },
  'redfin-us': {
    actorId: 'maxcopell~redfin-scraper',
    region: 'US',
    normalize: (item: any) => {
      const address = item.address || {};
      return {
        country: 'US',
        region: address.state || address.stateOrProvince || '',
        city: address.city || '',
        address_line1: address.line1 || address.street || '',
        postcode: address.zip || address.postalCode || '',
        location_lat: item.latitude || item.latLong?.latitude,
        location_lng: item.longitude || item.latLong?.longitude,
        price: item.price || item.listPrice || 0,
        currency: 'USD',
        bedrooms: item.beds || item.bedrooms,
        bathrooms: item.baths || item.bathrooms,
        square_feet: item.sqFt?.value,
        property_type: item.propertyType || item.homeType || 'residential',
        estimated_rent: item.rentEstimate,
        images: item.photos?.map((p: any) => p.url || p) || [],
        listing_url: item.url || `https://www.redfin.com${item.path || ''}`,
        source: 'redfin',
        source_refs: { mlsId: item.mlsId, listingId: item.listingId },
      };
    }
  },
  'realtor-us': {
    actorId: 'maxcopell~realtorcom-scraper',
    region: 'US',
    normalize: (item: any) => {
      const address = item.location?.address || item.address || {};
      return {
        country: 'US',
        region: address.state_code || address.state || '',
        city: address.city || '',
        address_line1: address.line || address.street || '',
        postcode: address.postal_code || address.zip || '',
        location_lat: address.lat || item.lat,
        location_lng: address.lon || item.lon,
        price: item.list_price || item.price || 0,
        currency: 'USD',
        bedrooms: item.description?.beds || item.beds,
        bathrooms: item.description?.baths || item.baths,
        square_feet: item.description?.sqft,
        property_type: item.description?.type || 'residential',
        estimated_rent: item.rental_price,
        images: item.photos?.map((p: any) => p.href || p.url || p) || [],
        listing_url: item.href || item.url || '',
        source: 'realtor',
        source_refs: { propertyId: item.property_id },
      };
    }
  },
  // ES provider
  'idealista-es': {
    actorId: 'maxcopell~idealista-scraper',
    region: 'ES',
    normalize: (item: any) => ({
      country: 'ES',
      region: item.province || '',
      city: item.municipality || item.district || '',
      address_line1: item.address || '',
      postcode: item.postalCode || '',
      location_lat: item.latitude,
      location_lng: item.longitude,
      price: item.price || 0,
      currency: 'EUR',
      bedrooms: item.rooms || item.bedrooms,
      bathrooms: item.bathrooms || 1,
      square_feet: item.size ? Math.round(item.size * 10.764) : undefined, // m² to sqft
      property_type: item.propertyType || 'residential',
      estimated_rent: item.estimatedRent,
      images: item.images || [],
      listing_url: item.url || '',
      source: 'idealista',
      source_refs: { propertyCode: item.propertyCode },
    })
  },
  // FR provider
  'seloger-fr': {
    actorId: 'maxcopell~seloger-scraper',
    region: 'FR',
    normalize: (item: any) => ({
      country: 'FR',
      region: item.location?.region || '',
      city: item.location?.city || '',
      address_line1: item.location?.address || '',
      postcode: item.location?.zipCode || '',
      location_lat: item.coordinates?.latitude,
      location_lng: item.coordinates?.longitude,
      price: item.price || 0,
      currency: 'EUR',
      bedrooms: item.rooms || item.bedrooms,
      bathrooms: item.bathrooms || 1,
      square_feet: item.surface ? Math.round(item.surface * 10.764) : undefined,
      property_type: item.propertyType || 'residential',
      estimated_rent: item.estimatedRent,
      images: item.photos || [],
      listing_url: item.url || '',
      source: 'seloger',
      source_refs: { id: item.id },
    })
  },
  // DE provider
  'immobilienscout-de': {
    actorId: 'maxcopell~immobilienscout-scraper',
    region: 'DE',
    normalize: (item: any) => ({
      country: 'DE',
      region: item.address?.state || '',
      city: item.address?.city || '',
      address_line1: item.address?.street || '',
      postcode: item.address?.postcode || '',
      location_lat: item.coordinates?.latitude,
      location_lng: item.coordinates?.longitude,
      price: item.price?.value || 0,
      currency: 'EUR',
      bedrooms: item.numberOfRooms,
      bathrooms: item.numberOfBathRooms || 1,
      square_feet: item.livingSpace ? Math.round(item.livingSpace * 10.764) : undefined,
      property_type: item.realEstateType || 'residential',
      estimated_rent: item.calculatedPrice?.value,
      images: item.galleryAttachments?.map((a: any) => a.url) || [],
      listing_url: item.url || '',
      source: 'immobilienscout',
      source_refs: { id: item['@id'] },
    })
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { provider, url, maxItems = 100, userId } = await req.json();

    if (!provider || !PROVIDERS[provider]) {
      return new Response(JSON.stringify({ error: 'Invalid provider' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const config = PROVIDERS[provider];
    const apifyToken = Deno.env.get('APIFY_API_KEY');

    if (!apifyToken) {
      return new Response(JSON.stringify({ error: 'APIFY_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Starting ${provider} scrape for URL: ${url}`);

    // Start Apify actor run
    const runResponse = await fetch(`https://api.apify.com/v2/acts/${config.actorId}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apifyToken}`,
      },
      body: JSON.stringify({
        startUrls: [{ url }],
        maxItems,
      }),
    });

    if (!runResponse.ok) {
      throw new Error(`Failed to start ${provider} run: ${runResponse.statusText}`);
    }

    const runData = await runResponse.json();
    const runId = runData.data.id;
    const datasetId = runData.data.defaultDatasetId;

    console.log(`${provider} run started: ${runId}`);

    // Wait for run to complete (with timeout)
    let status = 'RUNNING';
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max

    while (status === 'RUNNING' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
      
      const statusResponse = await fetch(`https://api.apify.com/v2/acts/${config.actorId}/runs/${runId}`, {
        headers: { 'Authorization': `Bearer ${apifyToken}` }
      });
      
      const statusData = await statusResponse.json();
      status = statusData.data.status;
      attempts++;
      
      console.log(`Run status: ${status} (attempt ${attempts}/${maxAttempts})`);
    }

    if (status !== 'SUCCEEDED') {
      return new Response(JSON.stringify({ 
        error: 'Scraping did not complete in time',
        runId,
        status 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch results
    const datasetResponse = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items`, {
      headers: { 'Authorization': `Bearer ${apifyToken}` }
    });

    const items = await datasetResponse.json();
    console.log(`Fetched ${items.length} items from ${provider}`);

    // Normalize and insert
    const normalized = items.map((item: any) => {
      const listing = config.normalize(item);
      return {
        ...listing,
        user_id: userId || null,
        data_provenance: {
          source_url: url,
          fetched_at: new Date().toISOString(),
          transformer_version: '1.0',
          run_id: runId,
          dataset_id: datasetId,
          provider,
        },
      };
    });

    // Batch insert
    const { data: inserted, error: insertError } = await supabaseClient
      .from('listings')
      .insert(normalized)
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    console.log(`Inserted ${inserted?.length || 0} listings`);

    // Trigger metrics calculation for inserted listings
    const listingIds = inserted?.map((l: any) => l.id) || [];
    
    for (const listingId of listingIds) {
      // Call calculate-deal function for each listing
      await supabaseClient.functions.invoke('calculate-deal', {
        body: { listingId }
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      provider,
      runId,
      datasetId,
      itemsFetched: items.length,
      itemsInserted: inserted?.length || 0,
      listingIds
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Ingestion error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
