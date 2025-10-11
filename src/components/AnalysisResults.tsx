import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react";

interface AnalysisResultsProps {
  analysis: any;
}

const AnalysisResults = ({ analysis }: AnalysisResultsProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { variant: "default" as const, label: "Excellent" };
    if (score >= 60) return { variant: "secondary" as const, label: "Good" };
    return { variant: "destructive" as const, label: "Risky" };
  };

  const cashFlowPositive = analysis.cash_flow_monthly > 0;

  return (
    <div className="space-y-6">
      {/* Property Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{analysis.property_address}</CardTitle>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">{analysis.property_type}</Badge>
            <Badge {...getScoreBadge(analysis.deal_quality_score)}>
              {getScoreBadge(analysis.deal_quality_score).label} Deal
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">ROI</span>
              <Percent className="h-4 w-4 text-primary" />
            </div>
            <div className="text-3xl font-bold text-primary">
              {analysis.roi_percentage?.toFixed(2)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Net Yield</span>
              <TrendingUp className="h-4 w-4 text-secondary" />
            </div>
            <div className="text-3xl font-bold text-secondary">
              {analysis.net_yield_percentage?.toFixed(2)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Cash Flow</span>
              {cashFlowPositive ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
            </div>
            <div
              className={`text-3xl font-bold ${
                cashFlowPositive ? "text-success" : "text-destructive"
              }`}
            >
              £{Math.abs(analysis.cash_flow_monthly).toFixed(0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">per month</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Deal Score</span>
              <DollarSign className="h-4 w-4 text-accent" />
            </div>
            <div className={`text-3xl font-bold ${getScoreColor(analysis.deal_quality_score)}`}>
              {analysis.deal_quality_score}
              <span className="text-xl">/100</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Property Details */}
      <Card>
        <CardHeader>
          <CardTitle>Property Financials</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Purchase Price:</span>
                <span className="font-semibold">
                  £{analysis.property_price?.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deposit:</span>
                <span className="font-semibold">
                  £{analysis.deposit_amount?.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly Rent:</span>
                <span className="font-semibold">
                  £{analysis.estimated_rent?.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mortgage Rate:</span>
                <span className="font-semibold">{analysis.mortgage_rate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly Costs:</span>
                <span className="font-semibold">
                  £{analysis.monthly_costs?.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Commentary */}
      <Card>
        <CardHeader>
          <CardTitle>Investment Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none text-foreground">
            <p className="whitespace-pre-line">{analysis.ai_commentary}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalysisResults;