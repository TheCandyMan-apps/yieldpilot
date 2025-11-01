import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import { getEntitlements } from "@/lib/entitlements";
import { PurchaseDialog } from "@/components/PurchaseDialog";

interface ReportData {
  deal: any;
  summary: string;
  assumptions: any;
  forecast?: any;
  branding?: {
    logo_url?: string;
    primary_color?: string;
    accent_color?: string;
    footer_text?: string;
  };
}

export default function ReportViewer() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isPrint = searchParams.get("print") === "1";
  
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPurchased, setIsPurchased] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [userPlan, setUserPlan] = useState<string>("free");
  const [contentHash, setContentHash] = useState<string>("");

  useEffect(() => {
    loadReport();
  }, [id]);

  async function loadReport() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Load report
      const { data: reportData, error } = await supabase
        .from("investor_reports")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      // Load branding if user has org
      let branding = undefined;
      if (user) {
        const { data: brandingData } = await supabase
          .from("org_branding")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (brandingData) {
          branding = {
            logo_url: brandingData.logo_url,
            primary_color: brandingData.primary_color,
            accent_color: brandingData.accent_color,
            footer_text: brandingData.footer_text,
          };
        }
      }

      // Check purchase status
      if (user) {
        const { data: metadata } = await supabase
          .from("investor_reports_metadata")
          .select("*")
          .eq("report_id", id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (metadata) {
          setIsPurchased(metadata.is_purchased || false);
          setContentHash(metadata.content_hash);
        }

        // Get user plan
        const entitlements = await getEntitlements(user.id);
        setUserPlan(entitlements?.plan || "free");
      }

      const reportContent = reportData.content as any;
      setReport({ ...reportContent, branding } as ReportData);
    } catch (error) {
      console.error("Error loading report:", error);
      toast.error("Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  async function downloadPDF() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to download");
        return;
      }

      const { data, error } = await supabase.functions.invoke("generate-report-pdf", {
        body: {
          reportId: id,
          deal: report?.deal,
          summary: report?.summary,
          assumptions: report?.assumptions,
          forecast: report?.forecast,
        },
      });

      if (error) throw error;

      window.open(data.url, "_blank");
      toast.success("PDF ready for download");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading report...</div>;
  }

  if (!report) {
    return <div className="flex items-center justify-center min-h-screen">Report not found</div>;
  }

  const isFree = userPlan === "free";
  const showWatermark = isFree && !isPurchased;
  const shouldRedact = isFree && !isPurchased;

  return (
    <div className="min-h-screen bg-background">
      {/* Watermark for free users */}
      {showWatermark && !isPrint && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="text-9xl font-bold text-muted-foreground/10 rotate-[-45deg] select-none">
            DEMO
          </div>
        </div>
      )}

      {/* Action Bar (hidden in print mode) */}
      {!isPrint && (
        <div className="sticky top-0 z-40 bg-background border-b px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Investment Report</h1>
          <div className="flex gap-2">
            {isFree && !isPurchased && (
              <Button onClick={() => setShowPurchase(true)} variant="default">
                Buy Full Report
              </Button>
            )}
            <Button onClick={downloadPDF} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Button variant="outline">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      )}

      {/* Report Content */}
      <div className="max-w-4xl mx-auto p-8">
        {/* Header with Branding */}
        {report.branding?.logo_url && (
          <div className="mb-8">
            <img src={report.branding.logo_url} alt="Logo" className="h-16" />
          </div>
        )}

        {/* Property Details */}
        <section className="mb-8">
          <h2 className="text-3xl font-bold mb-4" style={{ color: report.branding?.primary_color }}>
            {report.deal?.property_address || "Property Analysis"}
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Price:</span>
              <span className="ml-2 font-semibold">£{report.deal?.price?.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Bedrooms:</span>
              <span className="ml-2 font-semibold">{report.deal?.bedrooms}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Yield:</span>
              <span className="ml-2 font-semibold">{report.deal?.yield_percentage}%</span>
            </div>
            <div>
              <span className="text-muted-foreground">ROI:</span>
              <span className="ml-2 font-semibold">{report.deal?.roi_percentage}%</span>
            </div>
          </div>
        </section>

        {/* AI Summary */}
        <section className="mb-8">
          <h3 className="text-xl font-bold mb-3">AI Analysis</h3>
          <div className="prose prose-sm max-w-none">
            <p className="text-muted-foreground">{report.summary}</p>
          </div>
        </section>

        {/* Key Metrics */}
        <section className="mb-8">
          <h3 className="text-xl font-bold mb-3">Investment Assumptions</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {Object.entries(report.assumptions || {}).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}:</span>
                <span className="font-medium">{String(value)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Redacted Content for Free Users */}
        {shouldRedact && (
          <section className="mb-8 p-6 bg-muted/50 rounded-lg relative">
            <div className="absolute inset-0 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <Button onClick={() => setShowPurchase(true)} size="lg">
                Unlock Full Report - £29
              </Button>
            </div>
            <h3 className="text-xl font-bold mb-3">Detailed Risk Analysis</h3>
            <p className="text-muted-foreground">
              Premium content includes lease risk analysis, comparable properties, and detailed forecasts...
            </p>
          </section>
        )}

        {/* Forecast (if available and purchased) */}
        {report.forecast && !shouldRedact && (
          <section className="mb-8">
            <h3 className="text-xl font-bold mb-3">5-Year Forecast</h3>
            <div className="space-y-2 text-sm">
              {report.forecast.map((year: any, idx: number) => (
                <div key={idx} className="flex justify-between">
                  <span>Year {idx + 1}:</span>
                  <span className="font-medium">£{year.value?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t text-xs text-muted-foreground">
          <div className="flex justify-between items-center">
            <div>
              {report.branding?.footer_text || "Powered by YieldPilot"}
            </div>
            {contentHash && (
              <div className="flex items-center gap-2">
                <span>Report Hash: {contentHash.slice(0, 8)}...</span>
                <a href={`/verify?hash=${contentHash}`} className="underline">
                  Verify
                </a>
              </div>
            )}
          </div>
          <div className="mt-2 text-center">
            Generated on {new Date().toLocaleDateString()}
          </div>
        </footer>
      </div>

      {/* Purchase Dialog */}
      <PurchaseDialog
        open={showPurchase}
        onOpenChange={setShowPurchase}
        productType="full_report"
        metadata={{ reportId: id }}
      />
    </div>
  );
}
