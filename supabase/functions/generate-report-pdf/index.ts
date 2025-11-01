import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import jsPDF from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate hash from assumptions
function hashAssumptions(assumptions: any): string {
  const str = JSON.stringify(assumptions, Object.keys(assumptions).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Parse request body
    const { reportId, deal, summary, assumptions, forecast } = await req.json();

    // Load branding if available
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: brandingData } = await supabaseClient
      .from('org_branding')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // Check entitlements
    const { data: entitlements } = await supabaseClient
      .from('user_entitlements')
      .select('plan')
      .eq('user_id', user.id)
      .maybeSingle();

    const userPlan = entitlements?.plan || 'free';
    const isPro = userPlan !== 'free';

    // Check if purchased
    let isPurchased = false;
    if (reportId) {
      const { data: metadata } = await supabaseClient
        .from('investor_reports_metadata')
        .select('is_purchased')
        .eq('report_id', reportId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      isPurchased = metadata?.is_purchased || false;
    }

    const showWatermark = !isPro && !isPurchased;

    // Content hash for integrity
    const contentString = JSON.stringify({ deal, summary, assumptions, forecast });
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(contentString));
    const contentHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    console.log("Generating PDF for deal:", deal?.address || deal?.property_address);

    // Generate version hash
    const versionHash = `v${Date.now().toString(36)}`;

    // Create PDF
    const doc = new jsPDF() as any;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // Header with branding
    if (brandingData?.primary_color) {
      const hex = brandingData.primary_color.replace('#', '');
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      doc.setFillColor(r, g, b);
    } else {
      doc.setFillColor(59, 130, 246);
    }
    doc.rect(0, 0, pageWidth, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text("INVESTMENT DEAL ANALYSIS", pageWidth / 2, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(new Date().toLocaleDateString(), pageWidth / 2, 30, { align: "center" });
    
    // Watermark for free/unpurchased
    if (showWatermark) {
      doc.setFontSize(80);
      doc.setTextColor(200, 200, 200);
      doc.text('DEMO', 105, 150, { align: 'center', angle: 45 });
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
    }

    yPos = 50;

    // Property Details
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text("Property Details", 14, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.text(deal?.address || deal?.property_address || "N/A", 14, yPos);
    yPos += 5;

    if (deal?.city) {
      doc.text(`Location: ${deal.city}`, 14, yPos);
      yPos += 5;
    }

    yPos += 5;

    // Key Metrics
    doc.setFontSize(16);
    doc.text("Key Financial Metrics", 14, yPos);
    yPos += 10;

    const metrics = [
      ["Property Price", `£${(deal?.price || 0).toLocaleString()}`],
      ["Monthly Rent", `£${(deal?.estimated_rent || deal?.rent || 0).toLocaleString()}`],
      ["Gross Yield", `${(deal?.yield_percentage || deal?.grossYield || 0).toFixed(2)}%`],
      ["Net Yield", `${(deal?.netYield || 0).toFixed(2)}%`],
      ["ROI", `${(deal?.roi_percentage || deal?.roi || 0).toFixed(2)}%`],
      ["Monthly Cashflow", `£${(deal?.cash_flow_monthly || deal?.cashFlow || 0).toLocaleString()}`],
    ];

    doc.setFontSize(10);
    metrics.forEach(([label, value]) => {
      doc.text(`${label}:`, 14, yPos);
      doc.text(value, 80, yPos);
      yPos += 6;
    });

    yPos += 5;

    // Drivers
    if (summary?.drivers?.length > 0) {
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(16);
      doc.text("Investment Drivers", 14, yPos);
      yPos += 8;

      doc.setFillColor(219, 234, 254);
      doc.rect(14, yPos - 3, pageWidth - 28, 2, "F");
      yPos += 5;

      doc.setFontSize(10);
      summary.drivers.forEach((driver: string, i: number) => {
        const bullet = `${i + 1}. ${driver}`;
        const lines = doc.splitTextToSize(bullet, pageWidth - 28);
        doc.text(lines, 14, yPos);
        yPos += lines.length * 5 + 3;
      });

      yPos += 5;
    }

    // Risks
    if (summary?.risks?.length > 0) {
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(16);
      doc.text("Investment Risks", 14, yPos);
      yPos += 8;

      doc.setFillColor(255, 237, 213);
      doc.rect(14, yPos - 3, pageWidth - 28, 2, "F");
      yPos += 5;

      doc.setFontSize(10);
      summary.risks.forEach((risk: string, i: number) => {
        const bullet = `${i + 1}. ${risk}`;
        const lines = doc.splitTextToSize(bullet, pageWidth - 28);
        doc.text(lines, 14, yPos);
        yPos += lines.length * 5 + 3;
      });
    }

    // AI Forecast (if available)
    if (forecast) {
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(16);
      doc.text("AI Yield Forecast", 14, yPos);
      yPos += 8;

      doc.setFillColor(224, 231, 255);
      doc.rect(14, yPos - 3, pageWidth - 28, 2, "F");
      yPos += 5;

      doc.setFontSize(10);
      doc.text(`Horizon: ${forecast.forecast_horizon}`, 14, yPos);
      yPos += 6;
      doc.text(`Predicted Yield: ${forecast.predicted_yield_mid?.toFixed(2)}%`, 14, yPos);
      yPos += 6;
      doc.text(`Range: ${forecast.predicted_yield_low?.toFixed(2)}% - ${forecast.predicted_yield_high?.toFixed(2)}%`, 14, yPos);
      yPos += 6;
      doc.text(`Capital Appreciation: ${forecast.predicted_appreciation_pct > 0 ? '+' : ''}${forecast.predicted_appreciation_pct?.toFixed(1)}%`, 14, yPos);
      yPos += 6;
      doc.text(`Confidence: ${(forecast.confidence_score * 100).toFixed(0)}%`, 14, yPos);
      yPos += 8;

      if (forecast.ai_reasoning) {
        doc.setFontSize(9);
        const reasoningLines = doc.splitTextToSize(forecast.ai_reasoning, pageWidth - 28);
        doc.text(reasoningLines, 14, yPos);
        yPos += reasoningLines.length * 4;
      }

      yPos += 5;
    }

    // Footer with metadata
    const totalPages = doc.internal.getNumberOfPages();
    const generatedTime = new Date().toISOString();
    const assumptionsSummary = assumptions
      ? `${assumptions.deposit_pct}% deposit, ${assumptions.apr}% APR, ${assumptions.interest_only ? "IO" : "P&I"}`
      : "Default assumptions";
    const footerText = brandingData?.footer_text || "Powered by YieldPilot";

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(128, 128, 128);
      
      // Line 1: Branding and hash
      doc.text(footerText, 14, pageHeight - 15);
      doc.text(`Hash: ${contentHash.slice(0, 16)}...`, pageWidth - 14, pageHeight - 15, { align: "right" });
      
      // Line 2: Generated time and page
      doc.text(
        `Generated: ${new Date().toLocaleDateString()} | ${assumptionsSummary}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
    }

    // Convert to blob
    const pdfBlob = doc.output("arraybuffer");
    const pdfBuffer = new Uint8Array(pdfBlob);

    // Upload to storage with content hash
    const fileName = `${user.id}/${contentHash.slice(0, 16)}-${versionHash}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("investment-reports")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }

    console.log("PDF uploaded:", fileName);

    // Generate signed URL (24h expiry)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("investment-reports")
      .createSignedUrl(fileName, 86400); // 24 hours

    if (signedUrlError) {
      console.error("Signed URL error:", signedUrlError);
      throw new Error(`Failed to generate signed URL: ${signedUrlError.message}`);
    }

    console.log("Signed URL generated");

    return new Response(
      JSON.stringify({
        success: true,
        url: signedUrlData.signedUrl,
        fileName,
        contentHash,
        versionHash,
        expiresAt: new Date(Date.now() + 86400 * 1000).toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating PDF:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
