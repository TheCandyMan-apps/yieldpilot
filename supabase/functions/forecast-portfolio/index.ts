import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logger, generateRequestId } from "../_shared/log.ts";
import { corsHeaders } from "../_shared/cors.ts";

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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check tier - portfolio forecasts require Pro or higher
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    const tier = profile?.subscription_tier || 'free';
    if (tier === 'free' || tier === 'starter') {
      return new Response(JSON.stringify({ 
        error: 'upgrade_required',
        message: 'Portfolio forecasts require Pro tier or higher',
        tier,
        upgrade_url: '/billing'
      }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { listingIds, horizon = '24m' } = await req.json();

    if (!listingIds || !Array.isArray(listingIds) || listingIds.length === 0) {
      return new Response(JSON.stringify({ error: 'listingIds array required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (listingIds.length > 20) {
      return new Response(JSON.stringify({ error: 'Maximum 20 properties per portfolio forecast' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    logger.info('Portfolio forecast requested', { 
      userId: user.id, 
      propertyCount: listingIds.length, 
      horizon 
    }, requestId);

    // Fetch all listings with their metrics
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select(`
        *,
        listing_metrics (
          kpis,
          net_yield_pct,
          gross_yield_pct,
          score
        )
      `)
      .in('id', listingIds)
      .eq('user_id', user.id);

    if (listingsError) throw listingsError;

    if (!listings || listings.length === 0) {
      return new Response(JSON.stringify({ error: 'No listings found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Calculate portfolio aggregates
    const totalValue = listings.reduce((sum, l) => sum + (l.price || 0), 0);
    const avgYield = listings.reduce((sum, l) => 
      sum + (l.listing_metrics?.[0]?.net_yield_pct || 0), 0) / listings.length;
    
    const propertyTypes = listings.reduce((acc: Record<string, number>, l) => {
      const type = l.property_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const regions = listings.reduce((acc: Record<string, number>, l) => {
      const region = l.region || 'UK';
      acc[region] = (acc[region] || 0) + 1;
      return acc;
    }, {});

    // Build AI prompt for portfolio analysis
    const portfolioSummary = {
      propertyCount: listings.length,
      totalValue,
      avgYield,
      propertyTypes,
      regions,
      properties: listings.map(l => ({
        address: l.property_address,
        price: l.price,
        yield: l.listing_metrics?.[0]?.net_yield_pct,
        score: l.listing_metrics?.[0]?.score,
        city: l.city,
        region: l.region
      }))
    };

    // Call AI for portfolio-level forecast
    let portfolioForecast = null;
    if (lovableApiKey) {
      try {
        const prompt = `As a portfolio investment analyst, analyze this property portfolio and forecast performance over ${horizon}.

Portfolio Summary:
${JSON.stringify(portfolioSummary, null, 2)}

Provide:
1. Portfolio-wide yield forecast (weighted average)
2. Expected appreciation across the portfolio
3. Diversification score (0-100)
4. Key risks at portfolio level
5. Recommendations for optimization

Return JSON: { "avgYield": 0, "yieldRange": [0, 0], "appreciation": 0, "diversification": 0, "risks": [], "recommendations": [], "confidence": 0.75 }`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'You are a portfolio investment analyst. Provide forecasts in JSON format.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            response_format: { type: "json_object" }
          })
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || '{}';
          portfolioForecast = JSON.parse(content);
        }
      } catch (error) {
        logger.warn('AI portfolio forecast failed, using fallback', { 
          error: error instanceof Error ? error.message : String(error) 
        }, requestId);
      }
    }

    // Fallback calculation
    if (!portfolioForecast) {
      const yieldLow = avgYield * 0.85;
      const yieldHigh = avgYield * 1.15;
      const diversificationScore = Math.min(100, Object.keys(regions).length * 25 + Object.keys(propertyTypes).length * 15);
      
      portfolioForecast = {
        avgYield,
        yieldRange: [yieldLow, yieldHigh],
        appreciation: 8.0, // Conservative estimate
        diversification: diversificationScore,
        risks: ['Market concentration', 'Economic downturn exposure'],
        recommendations: ['Consider geographic diversification', 'Balance property types'],
        confidence: 0.7
      };
    }

    // Track usage
    await supabase
      .from('forecast_usage')
      .insert({
        user_id: user.id,
        listing_id: null, // Portfolio-level
        forecast_horizon: horizon,
        model_version: lovableApiKey ? 'portfolio_ai_v1' : 'portfolio_trend_v1'
      });

    logger.info('Portfolio forecast generated', { 
      userId: user.id, 
      propertyCount: listings.length,
      tier 
    }, requestId);

    return new Response(JSON.stringify({
      portfolio: portfolioSummary,
      forecast: {
        ...portfolioForecast,
        horizon,
        generated_at: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Portfolio forecast error', { error: errorMessage }, requestId);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
