import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, Loader2, Share2 } from "lucide-react";
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
        toast.error("Please sign in to generate summaries");
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
    
    const reportContent = `
INVESTMENT DEAL SUMMARY
${summary.title}
${deal.property_address}

===========================================
KEY METRICS
===========================================

Property Price: ${formatCurrency(deal.price)}
Estimated Rent: ${formatCurrency(deal.estimated_rent)}
Yield: ${summary.key_metrics.yield.toFixed(2)}%
ROI: ${summary.key_metrics.roi.toFixed(2)}%
Monthly Cash Flow: ${formatCurrency(deal.cash_flow_monthly)}
Investment Score: ${summary.key_metrics.investmentScore}

===========================================
INVESTMENT SUMMARY
===========================================

${summary.summary}

===========================================
RISK ASSESSMENT
===========================================

${summary.risk_rating}

===========================================
RECOMMENDATION
===========================================

${summary.recommendation}

===========================================
Generated: ${new Date().toLocaleString()}
    `.trim();

    const blob = new Blob([reportContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deal-summary-${deal.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Summary exported successfully");
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
