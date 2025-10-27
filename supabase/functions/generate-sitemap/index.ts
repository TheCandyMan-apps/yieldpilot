import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch latest 100 public deals
    const { data: deals } = await supabase
      .from('deals_feed')
      .select('id, property_address, updated_at')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(100);

    const baseUrl = 'https://yieldpilot.com';
    const today = new Date().toISOString().split('T')[0];

    // Build sitemap XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    // Homepage
    xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <lastmod>${today}</lastmod>\n    <priority>1.0</priority>\n  </url>\n`;
    
    // Static pages
    const pages = ['/deals', '/insights', '/area-insights'];
    for (const page of pages) {
      xml += `  <url>\n    <loc>${baseUrl}${page}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>0.8</priority>\n  </url>\n`;
    }
    
    // Deal pages (if you have individual deal pages)
    if (deals) {
      for (const deal of deals) {
        const lastmod = new Date(deal.updated_at).toISOString().split('T')[0];
        xml += `  <url>\n    <loc>${baseUrl}/deals/${deal.id}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <priority>0.6</priority>\n  </url>\n`;
      }
    }
    
    xml += '</urlset>';

    return new Response(xml, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml',
      },
    });
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate sitemap' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
