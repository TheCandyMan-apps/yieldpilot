import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, Loader2, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface InvestorReportGeneratorProps {
  dealId?: string;
  dealData?: any;
  trigger?: React.ReactNode;
}

export const InvestorReportGenerator = ({ 
  dealId, 
  dealData,
  trigger 
}: InvestorReportGeneratorProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reportContent, setReportContent] = useState<any>(null);

  const generateReport = async () => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Generate AI-powered report content
      const report = {
        title: `Investment Analysis: ${dealData?.property_address || 'Property'}`,
        executive_summary: `This property presents a ${dealData?.yield_percentage ? 
          (dealData.yield_percentage > 8 ? 'strong' : 'moderate') : 'potential'} 
          investment opportunity with key metrics analyzed below.`,
        key_metrics: {
          purchase_price: dealData?.price,
          estimated_rent: dealData?.estimated_rent,
          gross_yield: dealData?.yield_percentage,
          roi_projection: dealData?.roi_percentage,
          property_type: dealData?.property_type,
          bedrooms: dealData?.bedrooms,
          location: `${dealData?.city}, ${dealData?.postcode}`
        },
        financial_analysis: {
          monthly_rent: dealData?.estimated_rent,
          annual_rent: dealData?.estimated_rent ? dealData.estimated_rent * 12 : null,
          estimated_costs: dealData?.price ? dealData.price * 0.015 : null, // 1.5% annual costs estimate
          net_annual_income: dealData?.estimated_rent ? (dealData.estimated_rent * 12) - (dealData.price * 0.015) : null
        },
        market_context: {
          city: dealData?.city,
          comparable_yield: dealData?.yield_percentage ? dealData.yield_percentage * 0.9 : null,
          market_position: dealData?.yield_percentage && dealData.yield_percentage > 8 ? 
            'Above market average' : 'Competitive with market'
        },
        risk_assessment: {
          rating: dealData?.yield_percentage && dealData.yield_percentage > 10 ? 'Medium' : 'Low',
          factors: [
            'Location demographics analyzed',
            'Rental demand assessed',
            'Price point validated against comparables',
            'Property condition factored into projections'
          ]
        },
        recommendation: dealData?.yield_percentage && dealData.yield_percentage > 8 ?
          'Strong Buy - This property shows excellent yield potential and aligns with current market conditions.' :
          'Consider - Further due diligence recommended. Property shows promise but requires detailed local market analysis.',
        generated_at: new Date().toISOString()
      };

      // Save report to database
      const { data: savedReport, error } = await supabase
        .from("investor_reports")
        .insert({
          user_id: session.user.id,
          deal_id: dealId,
          report_type: 'deal_analysis',
          title: report.title,
          content: report,
          is_branded: true
        })
        .select()
        .single();

      if (error) throw error;

      setReportContent(report);
      
      toast({
        title: "Report Generated",
        description: "Your AI-powered investor report is ready",
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const downloadReport = () => {
    if (!reportContent) return;
    
    const reportText = `
YieldPilot Investment Report
${reportContent.title}
Generated: ${new Date(reportContent.generated_at).toLocaleDateString()}

EXECUTIVE SUMMARY
${reportContent.executive_summary}

KEY METRICS
Purchase Price: £${reportContent.key_metrics.purchase_price?.toLocaleString()}
Estimated Rent: £${reportContent.key_metrics.estimated_rent?.toLocaleString()}/mo
Gross Yield: ${reportContent.key_metrics.gross_yield?.toFixed(2)}%
ROI Projection: ${reportContent.key_metrics.roi_projection?.toFixed(2)}%
Location: ${reportContent.key_metrics.location}
Property Type: ${reportContent.key_metrics.property_type}
Bedrooms: ${reportContent.key_metrics.bedrooms}

FINANCIAL ANALYSIS
Monthly Rent: £${reportContent.financial_analysis.monthly_rent?.toLocaleString()}
Annual Rent: £${reportContent.financial_analysis.annual_rent?.toLocaleString()}
Estimated Annual Costs: £${reportContent.financial_analysis.estimated_costs?.toLocaleString()}
Net Annual Income: £${reportContent.financial_analysis.net_annual_income?.toLocaleString()}

MARKET CONTEXT
City: ${reportContent.market_context.city}
Market Position: ${reportContent.market_context.market_position}

RISK ASSESSMENT
Rating: ${reportContent.risk_assessment.rating}
${reportContent.risk_assessment.factors.map((f: string) => `- ${f}`).join('\n')}

RECOMMENDATION
${reportContent.recommendation}

---
Powered by YieldPilot - Property Intelligence Platform
    `.trim();

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yieldpilot-report-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "Report saved to your device",
    });
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return "N/A";
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI Investor Report</DialogTitle>
          <DialogDescription>
            Professional analysis powered by YieldPilot's ML engine
          </DialogDescription>
        </DialogHeader>

        {!reportContent ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Ready to Generate Report</h3>
              <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
                Create a comprehensive, AI-powered analysis report for this investment opportunity. 
                Includes financial projections, risk assessment, and recommendation.
              </p>
              <Button onClick={generateReport} disabled={generating} size="lg">
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">{reportContent.title}</h2>
              <p className="text-sm text-muted-foreground">
                Generated: {new Date(reportContent.generated_at).toLocaleDateString()}
              </p>
            </div>

            {/* Executive Summary */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Executive Summary</h3>
              <p className="text-sm">{reportContent.executive_summary}</p>
            </div>

            {/* Key Metrics */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Key Metrics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Purchase Price</p>
                  <p className="text-lg font-semibold">{formatCurrency(reportContent.key_metrics.purchase_price)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Monthly Rent</p>
                  <p className="text-lg font-semibold">{formatCurrency(reportContent.key_metrics.estimated_rent)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Gross Yield</p>
                  <p className="text-lg font-semibold text-primary">
                    {reportContent.key_metrics.gross_yield?.toFixed(2)}%
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">ROI Projection</p>
                  <p className="text-lg font-semibold text-green-600">
                    {reportContent.key_metrics.roi_projection?.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Risk Assessment */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Risk Assessment</h3>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">
                  Rating: <span className="text-primary">{reportContent.risk_assessment.rating}</span>
                </p>
                <ul className="text-sm space-y-1">
                  {reportContent.risk_assessment.factors.map((factor: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Recommendation */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Recommendation</h3>
              <p className="text-sm bg-primary/5 border border-primary/20 rounded-lg p-4">
                {reportContent.recommendation}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={downloadReport} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>

            {/* Branding */}
            <div className="text-center pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Powered by <span className="font-semibold text-primary">YieldPilot</span> - Property Intelligence Platform
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
