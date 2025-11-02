import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TrendingUp, AlertTriangle, Target, Lock, Loader2 } from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/portfolioCalculations";

interface EnhancedPortfolioMetricsProps {
  portfolioId: string;
}

export function EnhancedPortfolioMetrics({ portfolioId }: EnhancedPortfolioMetricsProps) {
  const [loading, setLoading] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if user has portfolio_analytics entitlement
    const { data: entitlements } = await supabase
      .from("user_entitlements")
      .select("features")
      .eq("user_id", user.id)
      .maybeSingle();

    const features = (entitlements?.features as Record<string, any>) || {};
    setHasAccess(features.portfolio_analytics === true);

    if (features.portfolio_analytics) {
      loadMetrics();
    }
  };

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("analyze-portfolio", {
        body: { portfolio_id: portfolioId },
      });

      if (error) throw error;
      setMetrics(data.metrics);
    } catch (error: any) {
      console.error("Error loading portfolio metrics:", error);
      toast.error("Failed to load portfolio analytics");
    } finally {
      setLoading(false);
    }
  };

  if (!hasAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Portfolio Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Unlock advanced diversification analysis, risk scoring, and AI recommendations
            </p>
            <Button onClick={() => window.location.href = "/billing"}>
              Upgrade to Portfolio Pro
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Diversification Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted-foreground">Diversification Score</span>
              <span className="text-sm font-medium">{metrics.diversification_score}/100</span>
            </div>
            <Progress value={metrics.diversification_score} className="h-2" />
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Geographic Concentration</p>
            <div className="space-y-2">
              {Object.entries(metrics.geographic_concentration || {}).map(([region, pct]: [string, any]) => (
                <div key={region} className="flex justify-between items-center text-sm">
                  <span>{region}</span>
                  <div className="flex items-center gap-2">
                    <Progress value={pct} className="w-24 h-2" />
                    <span className="font-medium w-12 text-right">{pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Property Type Mix</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(metrics.property_type_mix || {}).map(([type, count]: [string, any]) => (
                <Badge key={type} variant="secondary">
                  {type}: {count}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Risk Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted-foreground">Risk Score</span>
              <span className={`text-sm font-medium ${
                metrics.risk_score > 70 ? 'text-destructive' : 
                metrics.risk_score > 40 ? 'text-warning' : 
                'text-success'
              }`}>
                {metrics.risk_score}/100
              </span>
            </div>
            <Progress 
              value={metrics.risk_score} 
              className={`h-2 ${
                metrics.risk_score > 70 ? '[&>div]:bg-destructive' : 
                metrics.risk_score > 40 ? '[&>div]:bg-warning' : 
                '[&>div]:bg-success'
              }`}
            />
          </div>
        </CardContent>
      </Card>

      {metrics.recommendations && metrics.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              AI Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.recommendations.map((rec: any, idx: number) => (
                <div key={idx} className="p-3 bg-muted rounded-lg">
                  <div className="flex items-start gap-2">
                    <Badge variant={
                      rec.priority === 'high' ? 'destructive' : 
                      rec.priority === 'medium' ? 'default' : 
                      'secondary'
                    }>
                      {rec.priority}
                    </Badge>
                    <p className="text-sm flex-1">{rec.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
