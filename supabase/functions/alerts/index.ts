import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  filters_json: any;
}

async function sendWebPush(subscription: any, payload: any) {
  // Mock implementation - integrate with web-push library
  console.log('[alerts] Sending Web Push to:', subscription.endpoint);
  console.log('[alerts] Payload:', payload);
  // In production: use web-push npm package with VAPID keys
  // const webpush = require('web-push');
  // await webpush.sendNotification(subscription, JSON.stringify(payload));
}

async function sendFCM(fcmToken: string, payload: any) {
  // Mock implementation - integrate with FCM Admin SDK
  console.log('[alerts] Sending FCM to token:', fcmToken);
  console.log('[alerts] Payload:', payload);
  // In production: use firebase-admin
  // await admin.messaging().send({ token: fcmToken, notification: payload });
}

function matchesFilters(listing: any, filters: any): boolean {
  if (filters.country && listing.country !== filters.country) return false;
  if (filters.region && listing.region !== filters.region) return false;
  if (filters.min_price && listing.price < filters.min_price) return false;
  if (filters.max_price && listing.price > filters.max_price) return false;
  if (filters.min_beds && listing.beds < filters.min_beds) return false;
  if (filters.property_type && !filters.property_type.includes(listing.property_type)) return false;
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[alerts] Checking saved searches...');

    // Fetch active saved searches
    const { data: searches, error: searchError } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('is_active', true);

    if (searchError) throw searchError;
    if (!searches || searches.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No active searches' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch recent listings (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: recentListings, error: listingsError } = await supabase
      .from('v_investor_deals')
      .select('*')
      .gte('created_at', yesterday.toISOString());

    if (listingsError) throw listingsError;
    if (!recentListings || recentListings.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No recent listings' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let matchCount = 0;
    let notificationCount = 0;

    for (const search of searches as SavedSearch[]) {
      const matchingListings = recentListings.filter((listing) =>
        matchesFilters(listing, search.filters_json)
      );

      if (matchingListings.length === 0) continue;

      console.log(`[alerts] Found ${matchingListings.length} matches for search "${search.name}"`);

      // Insert search matches
      for (const listing of matchingListings) {
        const { error: matchError } = await supabase
          .from('search_matches')
          .insert({
            search_id: search.id,
            listing_id: listing.id,
            matched_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (!matchError) {
          matchCount++;
        }
      }

      // Fetch user push subscriptions
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', search.user_id)
        .eq('is_active', true);

      if (subscriptions && subscriptions.length > 0) {
        const topListings = matchingListings.slice(0, 3);
        const payload = {
          title: `${matchingListings.length} new properties match "${search.name}"`,
          body: topListings.map((l) => `${l.address} - ${l.currency}${l.price}`).join('\n'),
          data: {
            search_id: search.id,
            matches: matchingListings.map((l) => l.id),
          },
        };

        for (const sub of subscriptions) {
          try {
            if (sub.subscription_type === 'web_push' && sub.endpoint) {
              await sendWebPush(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
                payload
              );
              notificationCount++;
            } else if (sub.subscription_type === 'fcm' && sub.fcm_token) {
              await sendFCM(sub.fcm_token, payload);
              notificationCount++;
            }
          } catch (err) {
            console.error('[alerts] Error sending notification:', err);
          }
        }
      }

      // Update last_run_at
      await supabase
        .from('saved_searches')
        .update({ last_run_at: new Date().toISOString() })
        .eq('id', search.id);
    }

    console.log(`[alerts] Processed ${matchCount} matches, sent ${notificationCount} notifications`);

    return new Response(
      JSON.stringify({ success: true, matches: matchCount, notifications: notificationCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[alerts] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
