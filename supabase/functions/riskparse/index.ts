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
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { listingId, documentType, documentUrl, documentText } = await req.json();

    if (!listingId || !documentType) {
      return new Response(JSON.stringify({ error: 'listingId and documentType required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify listing exists and user has access
    const { data: listing } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .eq('user_id', user.id)
      .single();

    if (!listing) {
      return new Response(JSON.stringify({ error: 'Listing not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let riskFlags: string[] = [];
    let trustScore = 50;
    let aiSummary = '';
    let fraudIndicators: string[] = [];

    if (lovableApiKey && documentText) {
      try {
        const prompt = `Analyze this ${documentType} document for a property investment and identify risks, compliance issues, and fraud indicators.

Document type: ${documentType}
Document content:
${documentText.substring(0, 3000)}

Provide:
1. Risk flags (array of specific issues)
2. Trust score (0-100, where 100 is excellent)
3. Brief summary of key findings
4. Fraud indicators (if any)

Format as JSON: { "riskFlags": [], "trustScore": 0, "summary": "", "fraudIndicators": [] }`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'You are a property risk assessment expert. Analyze documents for risks, compliance, and fraud indicators.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.3
          })
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || '{}';
          
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const analysis = JSON.parse(jsonMatch[0]);
            riskFlags = analysis.riskFlags || [];
            trustScore = analysis.trustScore || 50;
            aiSummary = analysis.summary || '';
            fraudIndicators = analysis.fraudIndicators || [];
          }
        }
      } catch (error) {
        logger.warn('AI risk analysis failed, using basic checks', { error: error instanceof Error ? error.message : String(error) }, requestId);
      }
    }

    // Basic pattern-based checks as fallback
    if (!aiSummary && documentText) {
      const lowerText = documentText.toLowerCase();
      
      // Common red flags
      if (lowerText.includes('structural issue') || lowerText.includes('subsidence')) {
        riskFlags.push('Structural concerns mentioned');
        trustScore -= 15;
      }
      
      if (documentType === 'epc' && (lowerText.includes('rating f') || lowerText.includes('rating g'))) {
        riskFlags.push('Poor EPC rating (F or G)');
        trustScore -= 20;
      }
      
      if (lowerText.includes('damp') || lowerText.includes('mould')) {
        riskFlags.push('Damp/mould issues');
        trustScore -= 10;
      }

      if (lowerText.includes('leasehold') && lowerText.includes('short lease')) {
        riskFlags.push('Short leasehold term');
        trustScore -= 15;
      }

      aiSummary = `Basic analysis completed. ${riskFlags.length} potential issues identified.`;
    }

    // Store analysis
    const { data: docRisk } = await supabase
      .from('document_risks')
      .insert({
        listing_id: listingId,
        user_id: user.id,
        document_type: documentType,
        document_url: documentUrl,
        risk_flags: riskFlags,
        trust_score: Math.max(0, Math.min(100, trustScore)),
        ai_summary: aiSummary,
        fraud_indicators: fraudIndicators
      })
      .select()
      .single();

    logger.info('Document risk analysis completed', { listingId, documentType, trustScore }, requestId);

    return new Response(JSON.stringify(docRisk), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Risk parse error', { error: errorMessage }, requestId);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});