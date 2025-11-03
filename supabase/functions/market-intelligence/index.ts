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

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

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

    // Check AI Assistant entitlement
    const { data: hasAccess } = await supabase.rpc('has_entitlement', {
      _user_id: user.id,
      _feature: 'ai_assistant'
    });

    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Premium subscription required for AI Assistant' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check usage limit (5 queries per day for free, 50 for pro, unlimited for team)
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    const plan = subscription?.plan || 'free';
    const limits = { free: 5, starter: 15, pro: 50, team: -1 };
    const dailyLimit = limits[plan as keyof typeof limits] || 5;

    if (dailyLimit !== -1) {
      const today = new Date().toISOString().split('T')[0];
      const { count } = await supabase
        .from('ai_queries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('query_type', 'market_intelligence')
        .gte('created_at', today);

      if ((count || 0) >= dailyLimit) {
        return new Response(JSON.stringify({ 
          error: `Daily limit reached (${dailyLimit} queries). Upgrade your plan for more.`,
          limit: dailyLimit,
          used: count
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    const { question } = await req.json();

    if (!question) {
      return new Response(JSON.stringify({ error: 'Question is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    logger.info('Market intelligence query', { userId: user.id, question }, requestId);

    // Fetch relevant market data based on the question
    const questionLower = question.toLowerCase();
    let marketData = null;
    let regionalParams = null;
    
    // Extract countries/cities mentioned in the question
    const regions = ['uk', 'us', 'turkey', 'dubai', 'london', 'istanbul', 'new york', 'manchester'];
    const mentionedRegions = regions.filter(r => questionLower.includes(r));

    // Query market data
    let query = supabase
      .from('v_investor_deals')
      .select('*')
      .eq('is_active', true)
      .order('gross_yield_pct', { ascending: false })
      .limit(100);

    if (mentionedRegions.length > 0) {
      // Filter by region if mentioned
      const regionFilter = mentionedRegions.map(r => r.toUpperCase());
      query = query.in('region', regionFilter);
    }

    const { data: deals, error: dealsError } = await query;
    
    if (!dealsError && deals) {
      // Aggregate by city for market insights
      const cityStats: Record<string, any> = {};
      deals.forEach((deal: any) => {
        const city = deal.city || 'Unknown';
        if (!cityStats[city]) {
          cityStats[city] = {
            city,
            region: deal.region,
            country_code: deal.country_code,
            count: 0,
            avgPrice: 0,
            avgGrossYield: 0,
            avgNetYield: 0,
            totalPrice: 0,
            totalGrossYield: 0,
            totalNetYield: 0
          };
        }
        cityStats[city].count++;
        cityStats[city].totalPrice += deal.price || 0;
        cityStats[city].totalGrossYield += deal.gross_yield_pct || 0;
        cityStats[city].totalNetYield += deal.net_yield_pct || 0;
      });

      // Calculate averages
      Object.values(cityStats).forEach((stat: any) => {
        stat.avgPrice = Math.round(stat.totalPrice / stat.count);
        stat.avgGrossYield = (stat.totalGrossYield / stat.count).toFixed(2);
        stat.avgNetYield = (stat.totalNetYield / stat.count).toFixed(2);
        delete stat.totalPrice;
        delete stat.totalGrossYield;
        delete stat.totalNetYield;
      });

      marketData = {
        totalDeals: deals.length,
        citySummary: Object.values(cityStats).sort((a: any, b: any) => b.avgGrossYield - a.avgGrossYield).slice(0, 10),
        topDeals: deals.slice(0, 5).map((d: any) => ({
          city: d.city,
          region: d.region,
          price: d.price,
          grossYield: d.gross_yield_pct,
          netYield: d.net_yield_pct,
          propertyType: d.property_type
        }))
      };
    }

    // Fetch regional tax parameters
    const { data: regParams } = await supabase
      .from('regional_parameters')
      .select('*');
    
    regionalParams = regParams;

    // Build comprehensive context for AI
    const contextData = {
      marketData,
      regionalParams,
      dataTimestamp: new Date().toISOString(),
      dataSource: 'v_investor_deals and regional_parameters tables'
    };

    const systemPrompt = `You are YieldPilot Market Intelligence AI, an expert in global real estate investment markets.

Your role:
- Analyze real estate market data from our database
- Calculate yields, taxes, and returns using local tax rules
- Compare markets and provide data-driven insights
- Cite data sources and show your reasoning transparently

Available Data:
${JSON.stringify(contextData, null, 2)}

Guidelines:
1. Always cite specific numbers from the data when making claims
2. Explain your calculations step-by-step
3. Consider regional tax rules (stamp duty, property tax, maintenance costs)
4. Compare markets fairly using net yields (after all costs)
5. Mention data limitations (sample size, data freshness)
6. Be specific about cities, not just countries
7. Provide actionable insights

When comparing cities:
- Calculate net yield = gross yield - (property tax + maintenance + insurance)
- Factor in stamp duty for total investment required
- Consider vacancy rates and local market conditions

Format your response with clear sections:
📊 Data Summary
💡 Key Insights
📈 Calculations (show your work)
⚠️ Limitations
🎯 Recommendation`;

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        temperature: 0.3,
        max_tokens: 1500
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      logger.error('AI API error', { status: aiResponse.status, error: errorText }, requestId);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'AI credits depleted. Please contact support.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const answer = aiData.choices?.[0]?.message?.content || 'Unable to generate response';

    // Track usage
    await supabase
      .from('ai_queries')
      .insert({
        user_id: user.id,
        query_type: 'market_intelligence',
        query_text: question,
        response_text: answer,
        context_data: contextData
      });

    logger.info('Market intelligence response generated', { userId: user.id }, requestId);

    return new Response(JSON.stringify({
      answer,
      question,
      marketData,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Market intelligence error', { error: errorMessage }, requestId);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
