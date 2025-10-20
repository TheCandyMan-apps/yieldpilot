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
  title: string;
  summary: string;
  risk_rating: string;
  recommendation: string;
  key_metrics: {
    yield: number;
    roi: number;
    cashFlow: number;
    investmentScore: string;
  };
}

const DealSummaryGenerator = ({ deal, trigger }: DealSummaryGeneratorProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);

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

      // Call edge function to generate AI summary
      const { data, error } = await supabase.functions.invoke("generate-deal-summary", {
        body: {
          deal: {
            address: deal.property_address,
            price: deal.price,
            rent: deal.estimated_rent,
            yield: deal.yield_percentage,
            roi: deal.roi_percentage,
            cashFlow: deal.cash_flow_monthly,
            score: deal.investment_score,
            city: deal.city,
            type: deal.property_type,
          },
        },
      });

      if (error) throw error;

      setSummary(data.summary);
      
      // Save to database
      await supabase.from("deal_summaries").insert({
        deal_id: deal.id,
        user_id: user.id,
        title: data.summary.title,
        summary: data.summary.summary,
        risk_rating: data.summary.risk_rating,
        recommendation: data.summary.recommendation,
        key_metrics: data.summary.key_metrics,
      });

      toast.success("Summary generated successfully");
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
      doc.setFillColor(59, 130, 246); // Blue
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
      
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(summary.title, 14, yPos);
      yPos += 7;
      
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
          ['Annual Yield', `${summary.key_metrics.yield.toFixed(2)}%`],
          ['ROI', `${summary.key_metrics.roi.toFixed(2)}%`],
          ['Monthly Cash Flow', formatCurrency(deal.cash_flow_monthly)],
          ['Investment Score', summary.key_metrics.investmentScore],
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

      // Visual Metrics Bar Chart
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text("Performance Indicators", 14, yPos);
      yPos += 10;
      
      const drawMetricBar = (label: string, value: number, maxValue: number, color: [number, number, number], y: number) => {
        const barWidth = 120;
        const barHeight = 8;
        const labelWidth = 60;
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text(label, 14, y);
        
        // Background bar
        doc.setFillColor(240, 240, 240);
        doc.rect(14 + labelWidth, y - 5, barWidth, barHeight, 'F');
        
        // Value bar
        const fillWidth = (value / maxValue) * barWidth;
        doc.setFillColor(...color);
        doc.rect(14 + labelWidth, y - 5, fillWidth, barHeight, 'F');
        
        // Value text
        doc.setFont(undefined, 'bold');
        doc.text(`${value.toFixed(1)}%`, 14 + labelWidth + barWidth + 5, y);
      };
      
      drawMetricBar('Yield', summary.key_metrics.yield, 15, [34, 197, 94], yPos);
      yPos += 12;
      drawMetricBar('ROI', summary.key_metrics.roi, 25, [59, 130, 246], yPos);
      yPos += 20;

      // Investment Summary Section
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text("Investment Summary", 14, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const summaryLines = doc.splitTextToSize(summary.summary, pageWidth - 28);
      doc.text(summaryLines, 14, yPos);
      yPos += (summaryLines.length * 5) + 10;

      // Risk Assessment Section
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text("Risk Assessment", 14, yPos);
      yPos += 8;
      
      doc.setFillColor(255, 237, 213); // Light orange
      doc.rect(14, yPos - 3, pageWidth - 28, 2, 'F');
      yPos += 5;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const riskLines = doc.splitTextToSize(summary.risk_rating, pageWidth - 28);
      doc.text(riskLines, 14, yPos);
      yPos += (riskLines.length * 5) + 10;

      // Recommendation Section
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text("Recommendation", 14, yPos);
      yPos += 8;
      
      doc.setFillColor(219, 234, 254); // Light blue
      doc.rect(14, yPos - 3, pageWidth - 28, 2, 'F');
      yPos += 5;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const recommendationLines = doc.splitTextToSize(summary.recommendation, pageWidth - 28);
      doc.text(recommendationLines, 14, yPos);
      yPos += (recommendationLines.length * 5) + 15;

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

      // Save the PDF
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
              {/* Title */}
              <div>
                <h2 className="text-2xl font-bold mb-2">{summary.title}</h2>
                <p className="text-sm text-muted-foreground">{deal.property_address}</p>
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
                      {summary.key_metrics.yield.toFixed(2)}%
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground mb-1">ROI</p>
                    <p className="text-xl font-bold text-blue-600">
                      {summary.key_metrics.roi.toFixed(2)}%
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground mb-1">Score</p>
                    <p className="text-xl font-bold">{summary.key_metrics.investmentScore}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Summary */}
              <div>
                <h3 className="font-semibold mb-2">Investment Summary</h3>
                <p className="text-sm leading-relaxed">{summary.summary}</p>
              </div>

              {/* Risk & Recommendation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
                  <CardContent className="pt-6">
                    <h4 className="font-semibold mb-2">Risk Rating</h4>
                    <p className="text-sm">{summary.risk_rating}</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <CardContent className="pt-6">
                    <h4 className="font-semibold mb-2">Recommendation</h4>
                    <p className="text-sm">{summary.recommendation}</p>
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
