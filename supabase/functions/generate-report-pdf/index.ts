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

    const { deal, summary, assumptions } = await req.json();

    console.log("Generating PDF for deal:", deal.address);

    // Generate assumptions hash
    const assumptionsHash = hashAssumptions(assumptions || {});
    const versionHash = `v${Date.now().toString(36)}`;

    // Create PDF
    const doc = new jsPDF() as any;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // Header
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text("INVESTMENT DEAL ANALYSIS", pageWidth / 2, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(new Date().toLocaleDateString(), pageWidth / 2, 30, { align: "center" });

    yPos = 50;

    // Property Details
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text("Property Details", 14, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.text(deal.address || "N/A", 14, yPos);
    yPos += 5;

    if (deal.city) {
      doc.text(`Location: ${deal.city}`, 14, yPos);
      yPos += 5;
    }

    yPos += 5;

    // Key Metrics
    doc.setFontSize(16);
    doc.text("Key Financial Metrics", 14, yPos);
    yPos += 10;

    const metrics = [
      ["Property Price", `£${(deal.price || 0).toLocaleString()}`],
      ["Monthly Rent", `£${(deal.rent || 0).toLocaleString()}`],
      ["Gross Yield", `${(deal.grossYield || 0).toFixed(2)}%`],
      ["Net Yield", `${(deal.netYield || 0).toFixed(2)}%`],
      ["ROI", `${(deal.roi || 0).toFixed(2)}%`],
      ["Monthly Cashflow", `£${(deal.cashFlow || 0).toLocaleString()}`],
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

    // Footer with metadata
    const totalPages = doc.internal.getNumberOfPages();
    const generatedTime = new Date().toISOString();
    const assumptionsSummary = assumptions
      ? `${assumptions.deposit_pct}% deposit, ${assumptions.apr}% APR, ${assumptions.interest_only ? "IO" : "P&I"}`
      : "Default assumptions";

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(128, 128, 128);
      
      // Line 1: Generated time and assumptions
      doc.text(
        `Generated: ${generatedTime} | Assumptions: ${assumptionsSummary}`,
        pageWidth / 2,
        pageHeight - 15,
        { align: "center" }
      );
      
      // Line 2: Version and page
      doc.text(
        `Version: ${versionHash} | Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
    }

    // Convert to blob
    const pdfBlob = doc.output("arraybuffer");
    const pdfBuffer = new Uint8Array(pdfBlob);

    // Upload to storage with content hash
    const fileName = `${user.id}/${assumptionsHash}-${versionHash}.pdf`;
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
        assumptionsHash,
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
