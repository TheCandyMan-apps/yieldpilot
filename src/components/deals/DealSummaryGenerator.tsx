import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

const DealSummaryGenerator = ({ deal, trigger }: DealSummaryGeneratorProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [source, setSource] = useState<string>("");

  const generateSummary = async () => {
    setLoading(true);
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
            netYield: deal.yield_percentage, // Adjust if separate net yield is available
            roi: deal.roi_percentage,
            cashFlow: deal.cash_flow_monthly,
            dscr: 1.0, // Placeholder - adjust if available
            rentSource: "estimated", // Adjust based on actual source
            epc: "unknown", // Adjust if available
            crime: "unknown", // Adjust if available
            flood: "unknown", // Adjust if available
          },
        },
      });

      if (error) throw error;

      setSummary(data.summary);
      setSource(data.source);
      
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

  const downloadPDF = () => {
    if (!summary) return;
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPos = 20;

      // Header
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont(undefined, 'bold');
      doc.text("INVESTMENT DEAL ANALYSIS", pageWidth / 2, 20, { align: 'center' });
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      doc.text(new Date().toLocaleDateString(), pageWidth / 2, 30, { align: 'center' });
      
      yPos = 50;
      
      // Property Details Section
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text("Property Details", 14, yPos);
      yPos += 10;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(deal.property_address, 14, yPos);
      yPos += 5;
      
      if (deal.city) {
        doc.text(`Location: ${deal.city}`, 14, yPos);
        yPos += 5;
      }
      
      if (deal.property_type) {
        doc.text(`Type: ${deal.property_type}`, 14, yPos);
        yPos += 10;
      } else {
        yPos += 5;
      }

      // Key Metrics Table
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text("Key Financial Metrics", 14, yPos);
      yPos += 5;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value']],
        body: [
          ['Property Price', formatCurrency(deal.price)],
          ['Estimated Monthly Rent', formatCurrency(deal.estimated_rent)],
          ['Annual Yield', `${(deal.yield_percentage || 0).toFixed(2)}%`],
          ['ROI', `${(deal.roi_percentage || 0).toFixed(2)}%`],
          ['Monthly Cash Flow', formatCurrency(deal.cash_flow_monthly)],
          ['Investment Score', deal.investment_score || "N/A"],
        ],
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], fontSize: 11, fontStyle: 'bold' },
        bodyStyles: { fontSize: 10 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 70 },
          1: { cellWidth: 'auto' }
        }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Drivers Section
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text("Investment Drivers", 14, yPos);
      yPos += 8;
      
      doc.setFillColor(219, 234, 254);
      doc.rect(14, yPos - 3, pageWidth - 28, 2, 'F');
      yPos += 5;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      summary.drivers.forEach((driver, i) => {
        const bullet = `${i + 1}. ${driver}`;
        const lines = doc.splitTextToSize(bullet, pageWidth - 28);
        doc.text(lines, 14, yPos);
        yPos += (lines.length * 5) + 3;
      });
      yPos += 5;

      // Risks Section
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text("Investment Risks", 14, yPos);
      yPos += 8;
      
      doc.setFillColor(255, 237, 213);
      doc.rect(14, yPos - 3, pageWidth - 28, 2, 'F');
      yPos += 5;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      summary.risks.forEach((risk, i) => {
        const bullet = `${i + 1}. ${risk}`;
        const lines = doc.splitTextToSize(bullet, pageWidth - 28);
        doc.text(lines, 14, yPos);
        yPos += (lines.length * 5) + 3;
      });

      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `YieldPilot Investment Analysis | Generated: ${new Date().toLocaleString()} | Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      doc.save(`investment-analysis-${deal.id}.pdf`);
      toast.success("PDF report generated successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF report: " + (error instanceof Error ? error.message : "Unknown error"));
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
                <Button variant="outline" onClick={downloadPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
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
