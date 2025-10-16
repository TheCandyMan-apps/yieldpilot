import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ZooplaListing {
  listing_id: string;
  displayable_address: string;
  street_name?: string;
  town_or_city?: string;
  post_town?: string;
  postcode?: string;
  latitude?: number;
  longitude?: number;
  price?: number;
  num_bedrooms?: number;
  num_bathrooms?: number;
  property_type?: string;
  listing_status?: string;
  details_url?: string;
  image_url?: string;
  thumbnail_url?: string;
  short_description?: string;
}

function generateCanonicalKey(listing: ZooplaListing): string {
  const line1 = (listing.street_name || listing.displayable_address || "").toLowerCase().trim();
  const postcode = (listing.postcode || "").toUpperCase().trim();
  const lat = listing.latitude ? listing.latitude.toFixed(4) : "0";
  const lng = listing.longitude ? listing.longitude.toFixed(4) : "0";
  return `${line1}|${postcode}|${lat},${lng}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { area, radius = 5, minPrice, maxPrice, minBeds, propertyType } = await req.json();

    // Zoopla API integration
    const zooplaApiKey = Deno.env.get("ZOOPLA_API_KEY");
    if (!zooplaApiKey) {
      console.log("⚠️ ZOOPLA_API_KEY not set, using mock data");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Zoopla API key not configured. Using mock data mode.",
          count: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Build Zoopla API URL
    const params = new URLSearchParams({
      api_key: zooplaApiKey,
      area: area,
      radius: radius.toString(),
      listing_status: "sale",
      page_size: "100",
    });

    if (minPrice) params.append("minimum_price", minPrice.toString());
    if (maxPrice) params.append("maximum_price", maxPrice.toString());
    if (minBeds) params.append("minimum_beds", minBeds.toString());
    if (propertyType) params.append("property_type", propertyType);

    const zooplaUrl = `https://api.zoopla.co.uk/api/v1/property_listings.json?${params}`;
    
    console.log("🔍 Fetching from Zoopla:", area);
    const response = await fetch(zooplaUrl);
    
    if (!response.ok) {
      throw new Error(`Zoopla API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const listings: ZooplaListing[] = data.listing || [];

    console.log(`📥 Received ${listings.length} listings from Zoopla`);

    let inserted = 0;
    let updated = 0;

    for (const zListing of listings) {
      try {
        // 1. Upsert to listing_sources
        const { error: sourceError } = await supabase
          .from("listing_sources")
          .upsert({
            provider: "zoopla",
            external_id: zListing.listing_id,
            url: zListing.details_url || "",
            payload: zListing,
            last_seen_at: new Date().toISOString(),
          }, {
            onConflict: "provider,external_id",
            ignoreDuplicates: false,
          });

        if (sourceError) {
          console.error("Error upserting source:", sourceError);
          continue;
        }

        // 2. Normalize and upsert to listings
        const canonicalKey = generateCanonicalKey(zListing);
        
        const images = [];
        if (zListing.image_url) images.push({ src: zListing.image_url, provider: "zoopla" });
        if (zListing.thumbnail_url) images.push({ src: zListing.thumbnail_url, provider: "zoopla", thumbnail: true });

        const listingData = {
          canonical_key: canonicalKey,
          address_line1: zListing.street_name || zListing.displayable_address,
          address_line2: null,
          address_town: zListing.town_or_city || zListing.post_town,
          postcode: zListing.postcode,
          lat: zListing.latitude,
          lng: zListing.longitude,
          price: zListing.price,
          bedrooms: zListing.num_bedrooms,
          bathrooms: zListing.num_bathrooms,
          property_type: zListing.property_type,
          tenure: null,
          images: images,
          source_refs: [{ provider: "zoopla", external_id: zListing.listing_id, url: zListing.details_url }],
          is_active: zListing.listing_status === "sale",
          updated_at: new Date().toISOString(),
        };

        const { data: existingListing } = await supabase
          .from("listings")
          .select("id")
          .eq("canonical_key", canonicalKey)
          .single();

        if (existingListing) {
          const { error: updateError } = await supabase
            .from("listings")
            .update(listingData)
            .eq("id", existingListing.id);
          
          if (!updateError) updated++;
        } else {
          const { data: newListing, error: insertError } = await supabase
            .from("listings")
            .insert(listingData)
            .select("id")
            .single();
          
          if (!insertError && newListing) {
            inserted++;
            
            // Initialize metrics with mock enrichment
            await supabase.from("listing_metrics").insert({
              listing_id: newListing.id,
              enrichment: {
                epc: { 
                  band: mockEPCBand(zListing.price, zListing.property_type),
                  provenance: "mock",
                  confidence: 0.3
                },
                area: {
                  rentRef: mockRentEstimate(zListing.price, zListing.num_bedrooms),
                  demandIndex: 65,
                  growth3y: 15,
                  provenance: "mock",
                  confidence: 0.3
                },
                risks: {
                  floodTier: "Low",
                  crimeIndex: 45,
                  provenance: "mock",
                  confidence: 0.3
                }
              }
            });
          }
        }
      } catch (error) {
        console.error("Error processing listing:", error);
      }
    }

    console.log(`✅ Processed: ${inserted} new, ${updated} updated`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        inserted, 
        updated, 
        total: listings.length,
        message: `Synced ${listings.length} listings from Zoopla` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in sync-zoopla-listings:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Mock helpers
function mockEPCBand(price?: number, propertyType?: string): string {
  if (!price) return "D";
  if (price > 500000) return "C";
  if (price > 300000) return "D";
  return "E";
}

function mockRentEstimate(price?: number, beds?: number): number {
  if (!price) return 1000;
  // Rough UK BTL rule: 0.4-0.6% of value per month
  const baseRent = price * 0.005;
  const bedMultiplier = beds ? 1 + (beds - 2) * 0.15 : 1;
  return Math.round(baseRent * bedMultiplier);
}
