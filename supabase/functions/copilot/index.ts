import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messages, dealContext, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build system prompt with deal context
    let systemPrompt = `You are YieldPilot Copilot, an expert UK property investment advisor. You provide actionable, data-driven advice based on real deal metrics.

CRITICAL RULES:
- Only reference data explicitly provided in the context
- Never hallucinate addresses, prices, or numbers
- If data is missing, say "I don't have that information"
- Always cite specific numbers from the deal context
- Provide concrete, actionable recommendations
- Consider UK market conditions and regulations
- Focus on yield, cashflow, DSCR, and risk factors

Current date: ${new Date().toISOString().split('T')[0]}`;

    if (dealContext) {
      systemPrompt += `\n\nDEAL CONTEXT:\n${JSON.stringify(dealContext, null, 2)}`;
    }

    if (action) {
      systemPrompt += `\n\nUSER ACTION REQUEST: ${action}`;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits depleted. Please add credits in Settings.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    const assistantMessage = data.choices[0]?.message?.content;

    if (!assistantMessage) {
      throw new Error('No response from AI');
    }

    // Save conversation to DB
    const conversationId = dealContext?.listing_id || crypto.randomUUID();
    const contextHash = dealContext ? JSON.stringify(dealContext) : null;

    const { error: saveError } = await supabaseClient
      .from('copilot_conversations')
      .upsert({
        user_id: user.id,
        listing_id: dealContext?.listing_id,
        context_hash: contextHash,
        messages: [...messages, { role: 'assistant', content: assistantMessage }],
      }, {
        onConflict: 'user_id,context_hash',
      });

    if (saveError) {
      console.error('Error saving conversation:', saveError);
    }

    return new Response(JSON.stringify({ message: assistantMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Copilot error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
