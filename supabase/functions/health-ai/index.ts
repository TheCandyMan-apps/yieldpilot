import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { logger, generateRequestId } from "../_shared/log.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = generateRequestId();
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user (optional for health check)
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    let userTier = 'free';
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_tier')
          .eq('id', user.id)
          .single();
        userTier = profile?.subscription_tier || 'free';
      }
    }

    // Check Lovable AI availability
    const aiAvailable = !!lovableApiKey;
    let aiStatus = 'unavailable';
    let aiLatency = 0;

    if (aiAvailable) {
      const startTime = Date.now();
      try {
        const testResponse = await fetch('https://ai.gateway.lovable.dev/v1/models', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`
          }
        });
        aiLatency = Date.now() - startTime;
        aiStatus = testResponse.ok ? 'healthy' : 'degraded';
      } catch (error) {
        aiStatus = 'error';
        logger.error('AI health check failed', { error: error instanceof Error ? error.message : String(error) }, requestId);
      }
    }

    // Get usage statistics
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let todayUsage = 0;
    let monthUsage = 0;
    let quotaRemaining = -1;

    if (userId) {
      const { data: todayData } = await supabase
        .from('forecast_usage')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .gte('created_at', today.toISOString());
      
      todayUsage = todayData?.length || 0;

      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const { data: monthData } = await supabase
        .from('forecast_usage')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .gte('created_at', monthStart.toISOString());
      
      monthUsage = monthData?.length || 0;

      // Calculate quota remaining
      const dailyLimit = userTier === 'free' ? 1 : userTier === 'starter' ? 3 : userTier === 'pro' ? 10 : -1;
      quotaRemaining = dailyLimit === -1 ? -1 : Math.max(0, dailyLimit - todayUsage);
    }

    // Get system-wide statistics
    const { data: totalForecasts } = await supabase
      .from('forecast_usage')
      .select('id', { count: 'exact' });

    const { data: recentForecasts } = await supabase
      .from('forecast_usage')
      .select('created_at')
      .gte('created_at', today.toISOString());

    logger.info('AI health check', { 
      userId, 
      userTier, 
      aiStatus, 
      todayUsage, 
      quotaRemaining 
    }, requestId);

    return new Response(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      ai: {
        available: aiAvailable,
        status: aiStatus,
        latency_ms: aiLatency,
        model_version: 'google/gemini-2.5-flash',
        endpoints: {
          copilot: '/functions/v1/copilot-advisor',
          forecast: '/functions/v1/forecast',
          portfolio: '/functions/v1/forecast-portfolio'
        }
      },
      user: userId ? {
        tier: userTier,
        usage_today: todayUsage,
        usage_month: monthUsage,
        quota_remaining: quotaRemaining,
        quota_unlimited: quotaRemaining === -1
      } : null,
      system: {
        total_forecasts: totalForecasts?.length || 0,
        forecasts_today: recentForecasts?.length || 0,
        uptime_pct: 99.9 // TODO: Track actual uptime
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Health check error', { error: errorMessage }, requestId);
    return new Response(JSON.stringify({ 
      status: 'error',
      error: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
