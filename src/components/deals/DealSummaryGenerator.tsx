import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, Loader2, Share2, RefreshCw, AlertCircle, Mail } from "lucide-react";
import { toast } from "sonner";

interface Deal {
  id: string;
  property_address: string;
  price: number;
  estimated_rent?: number;
  yield_percentage?: number;
  roi_percentage?: number;
  cash_flow_monthly?: number;
  investment_score?: string;
  city?: string;
  property_type?: string;
}

interface DealSummaryGeneratorProps {
  deal: Deal;
  trigger?: React.ReactNode;
  assumptions?: any;
}

interface Summary {
  drivers: string[];
  risks: string[];
}

interface SummaryResponse {
  success: boolean;
  summary: Summary;
  source: "ai" | "heuristic" | "heuristic_fallback";
}

// Generate hash from assumptions for regeneration detection
function hashAssumptions(assumptions: any): string {
  if (!assumptions) return "default";
  const str = JSON.stringify(assumptions, Object.keys(assumptions).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

const DealSummaryGenerator = ({ deal, trigger, assumptions }: DealSummaryGeneratorProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [source, setSource] = useState<string>("");
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [pdfError, setPdfError] = useState<string>("");
  const [currentAssumptionsHash, setCurrentAssumptionsHash] = useState<string>("");
  const [savedAssumptionsHash, setSavedAssumptionsHash] = useState<string>("");

  useEffect(() => {
    if (assumptions) {
      setCurrentAssumptionsHash(hashAssumptions(assumptions));
    }
  }, [assumptions]);

  const needsRegeneration = savedAssumptionsHash && 
    currentAssumptionsHash && 
    savedAssumptionsHash !== currentAssumptionsHash;

  const generateSummary = async () => {
    setLoading(true);
    setPdfError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to generate AI summaries");
        setOpen(false);
        window.location.href = "/auth";
        return;
      }

      // Call edge function to generate AI summary with KPI data
      const { data, error } = await supabase.functions.invoke("generate-deal-summary", {
        body: {
          deal: {
            address: deal.property_address,
            price: deal.price,
            rent: deal.estimated_rent,
            grossYield: deal.yield_percentage,
            netYield: deal.yield_percentage,
            roi: deal.roi_percentage,
            cashFlow: deal.cash_flow_monthly,
            dscr: 1.0,
            rentSource: "estimated",
            epc: "unknown",
            crime: "unknown",
            flood: "unknown",
          },
        },
      });

      if (error) throw error;

      setSummary(data.summary);
      setSource(data.source);
      
      const assumptionsHash = hashAssumptions(assumptions);
      setSavedAssumptionsHash(assumptionsHash);
      
      // Save to database
      await supabase.from("deal_summaries").insert({
        deal_id: deal.id,
        user_id: user.id,
        title: `Investment Analysis: ${deal.property_address}`,
        summary: `Drivers: ${data.summary.drivers.join(", ")} | Risks: ${data.summary.risks.join(", ")}`,
        risk_rating: data.summary.risks.length > 0 ? data.summary.risks[0] : "Standard risks",
        recommendation: data.summary.drivers.length > 0 ? data.summary.drivers[0] : "Review opportunity",
        key_metrics: {
          yield: deal.yield_percentage || 0,
          roi: deal.roi_percentage || 0,
          cashFlow: deal.cash_flow_monthly || 0,
          investmentScore: deal.investment_score || "C",
        },
        assumptions_hash: assumptionsHash,
      });

      toast.success(
        data.source === "ai" 
          ? "AI summary generated successfully" 
          : "Summary generated (heuristic fallback)"
      );
    } catch (error: any) {
      toast.error("Error generating summary: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!summary) return;
    
    setPdfLoading(true);
    setPdfError("");
    
    try {
      const { data, error } = await supabase.functions.invoke("generate-report-pdf", {
        body: {
          deal: {
            address: deal.property_address,
            price: deal.price,
            rent: deal.estimated_rent,
            grossYield: deal.yield_percentage,
            netYield: deal.yield_percentage,
            roi: deal.roi_percentage,
            cashFlow: deal.cash_flow_monthly,
            city: deal.city,
          },
          summary,
          assumptions: assumptions || {},
        },
      });

      if (error) throw error;

      if (data.success && data.url) {
        setPdfUrl(data.url);
        setSavedAssumptionsHash(data.assumptionsHash);
        
        // Open PDF in new tab
        window.open(data.url, "_blank");
        toast.success("PDF generated successfully");
      } else {
        throw new Error(data.error || "Failed to generate PDF");
      }
    } catch (error: any) {
      console.error("PDF generation error:", error);
      setPdfError(error.message || "Failed to generate PDF");
      toast.error("Failed to generate PDF: " + (error.message || "Unknown error"));
    } finally {
      setPdfLoading(false);
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return "N/A";
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <>
      <div onClick={() => setOpen(true)}>
        {trigger || (
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Generate Summary
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Investment Deal Summary</DialogTitle>
            <DialogDescription>{deal.property_address}</DialogDescription>
          </DialogHeader>

          {!summary ? (
            <div className="py-12 text-center">
              {loading ? (
                <>
                  <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin mb-4" />
                  <p className="text-muted-foreground">
                    Generating AI-powered investment summary...
                  </p>
                </>
              ) : (
                <>
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Generate Deal Summary</h3>
                  <p className="text-muted-foreground mb-6">
                    Get a professional investment summary with AI analysis
                  </p>
                  <Button onClick={generateSummary} disabled={loading}>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Now
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header */}
              <div>
                <h2 className="text-2xl font-bold mb-2">Investment Analysis</h2>
                <p className="text-sm text-muted-foreground">{deal.property_address}</p>
                {source && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Source: {source === "ai" ? "AI-Generated" : "Heuristic Analysis"}
                  </p>
                )}
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground mb-1">Price</p>
                    <p className="text-xl font-bold">{formatCurrency(deal.price)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground mb-1">Yield</p>
                    <p className="text-xl font-bold text-green-600">
                      {(deal.yield_percentage || 0).toFixed(2)}%
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground mb-1">ROI</p>
                    <p className="text-xl font-bold text-blue-600">
                      {(deal.roi_percentage || 0).toFixed(2)}%
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground mb-1">Score</p>
                    <p className="text-xl font-bold">{deal.investment_score || "N/A"}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Drivers & Risks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <CardContent className="pt-6">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <span className="text-blue-600">✓</span> Investment Drivers
                    </h4>
                    <ul className="space-y-2">
                      {summary.drivers.map((driver, i) => (
                        <li key={i} className="text-sm flex gap-2">
                          <span className="text-blue-600 font-bold">{i + 1}.</span>
                          <span>{driver}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <Card className="bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
                  <CardContent className="pt-6">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <span className="text-orange-600">⚠</span> Investment Risks
                    </h4>
                    <ul className="space-y-2">
                      {summary.risks.map((risk, i) => (
                        <li key={i} className="text-sm flex gap-2">
                          <span className="text-orange-600 font-bold">{i + 1}.</span>
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Actions */}
              <DialogFooter className="flex gap-2">
                {pdfError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="ml-2">
                      {pdfError}
                      <div className="flex gap-2 mt-2">
                        <Button variant="outline" size="sm" onClick={downloadPDF}>
                          Try Again
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href="mailto:support@yieldpilot.app?subject=PDF Generation Error">
                            <Mail className="h-3 w-3 mr-1" />
                            Contact Support
                          </a>
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                
                {needsRegeneration && pdfUrl && (
                  <Button 
                    variant="outline" 
                    onClick={downloadPDF}
                    disabled={pdfLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${pdfLoading ? 'animate-spin' : ''}`} />
                    Regenerate PDF (Assumptions Changed)
                  </Button>
                )}
                
                {pdfUrl && !needsRegeneration ? (
                  <Button variant="outline" onClick={() => window.open(pdfUrl, "_blank")}>
                    <Download className="h-4 w-4 mr-2" />
                    View PDF
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    onClick={downloadPDF} 
                    disabled={pdfLoading}
                  >
                    {pdfLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Export PDF
                      </>
                    )}
                  </Button>
                )}
                
                <Button variant="outline">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button onClick={() => setOpen(false)}>Close</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DealSummaryGenerator;
