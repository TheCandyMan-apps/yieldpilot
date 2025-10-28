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

    const { listingId, horizon = '24m' } = await req.json();

    if (!listingId) {
      return new Response(JSON.stringify({ error: 'listingId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check cache first
    const { data: cachedForecast } = await supabase
      .from('forecast_cache')
      .select('*')
      .eq('listing_id', listingId)
      .eq('forecast_horizon', horizon)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cachedForecast) {
      logger.info('Returning cached forecast', { listingId, horizon }, requestId);
      return new Response(JSON.stringify(cachedForecast), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch listing + metrics
    const { data: listing } = await supabase
      .from('listings')
      .select(`
        *,
        listing_metrics (*)
      `)
      .eq('id', listingId)
      .single();

    if (!listing) {
      return new Response(JSON.stringify({ error: 'Listing not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch area analytics for context
    const postcodePrefix = listing.postcode?.split(' ')[0] || '';
    const { data: areaData } = await supabase
      .from('area_analytics')
      .select('*')
      .eq('postcode_prefix', postcodePrefix)
      .eq('city', listing.city)
      .order('data_date', { ascending: false })
      .limit(1)
      .single();

    // Build input signals
    const inputSignals = {
      currentPrice: listing.price,
      currentRent: listing.listing_metrics?.[0]?.kpis?.monthly_rent || 0,
      currentYield: listing.listing_metrics?.[0]?.net_yield_pct || 0,
      areaAvgYield: areaData?.avg_yield_current || 0,
      areaGrowth1yr: areaData?.price_growth_1yr || 0,
      areaGrowth5yr: areaData?.price_growth_5yr_forecast || 0,
      rentalGrowth1yr: areaData?.rental_growth_1yr || 0,
      postcode: listing.postcode,
      region: listing.region || 'UK',
      propertyType: listing.property_type,
      bedrooms: listing.bedrooms
    };

    // Call AI for forecast reasoning
    let aiReasoning = '';
    let predictedYieldLow = 0;
    let predictedYieldMid = 0;
    let predictedYieldHigh = 0;
    let predictedAppreciation = 0;
    let confidence = 0.75;

    if (lovableApiKey) {
      try {
        const prompt = `As a property investment analyst, forecast the yield and appreciation for this property over ${horizon}.

Current metrics:
- Price: ${listing.currency} ${inputSignals.currentPrice}
- Rent: ${listing.currency} ${inputSignals.currentRent}/mo
- Current Yield: ${inputSignals.currentYield.toFixed(2)}%
- Area Avg Yield: ${inputSignals.areaAvgYield.toFixed(2)}%
- Area Price Growth 1yr: ${inputSignals.areaGrowth1yr.toFixed(2)}%
- Rental Growth 1yr: ${inputSignals.rentalGrowth1yr.toFixed(2)}%
- Property: ${inputSignals.bedrooms} bed ${inputSignals.propertyType} in ${inputSignals.postcode}

Provide a forecast with:
1. Predicted yield range (low/mid/high) for ${horizon}
2. Expected capital appreciation %
3. Key drivers and risks
4. Confidence level (0-1)

Format as JSON: { "yieldLow": 0, "yieldMid": 0, "yieldHigh": 0, "appreciation": 0, "confidence": 0.75, "reasoning": "" }`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'You are a property investment forecasting expert. Provide data-driven forecasts in JSON format.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7
          })
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || '{}';
          
          // Extract JSON from response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const forecast = JSON.parse(jsonMatch[0]);
            predictedYieldLow = forecast.yieldLow || inputSignals.currentYield * 0.9;
            predictedYieldMid = forecast.yieldMid || inputSignals.currentYield;
            predictedYieldHigh = forecast.yieldHigh || inputSignals.currentYield * 1.1;
            predictedAppreciation = forecast.appreciation || inputSignals.areaGrowth1yr;
            confidence = forecast.confidence || 0.75;
            aiReasoning = forecast.reasoning || '';
          }
        }
      } catch (error) {
        logger.warn('AI forecast failed, using fallback', { error: error instanceof Error ? error.message : String(error) }, requestId);
      }
    }

    // Fallback: simple trend-based forecast
    if (predictedYieldMid === 0) {
      const trendMultiplier = 1 + (inputSignals.rentalGrowth1yr / 100);
      predictedYieldMid = inputSignals.currentYield * trendMultiplier;
      predictedYieldLow = predictedYieldMid * 0.85;
      predictedYieldHigh = predictedYieldMid * 1.15;
      predictedAppreciation = inputSignals.areaGrowth1yr;
      aiReasoning = 'Trend-based forecast using area averages';
    }

    // Store in cache
    const { data: forecast } = await supabase
      .from('forecast_cache')
      .insert({
        listing_id: listingId,
        postcode: listing.postcode || '',
        region: listing.region || 'UK',
        forecast_horizon: horizon,
        predicted_yield_low: predictedYieldLow,
        predicted_yield_mid: predictedYieldMid,
        predicted_yield_high: predictedYieldHigh,
        predicted_appreciation_pct: predictedAppreciation,
        confidence_score: confidence,
        input_signals: inputSignals,
        model_version: lovableApiKey ? 'ai_v1' : 'trend_v1'
      })
      .select()
      .single();

    logger.info('Generated forecast', { listingId, horizon }, requestId);

    return new Response(JSON.stringify({
      ...forecast,
      ai_reasoning: aiReasoning
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Forecast error', { error: errorMessage }, requestId);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});