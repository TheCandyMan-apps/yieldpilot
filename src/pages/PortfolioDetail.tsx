import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Plus, TrendingUp, AlertTriangle, Building2, DollarSign } from "lucide-react";
import { ScenarioRunner } from "@/components/portfolio/ScenarioRunner";
import { EnhancedPortfolioMetrics } from "@/components/premium/EnhancedPortfolioMetrics";
import { calculatePortfolioSummary, formatCurrency, formatPercentage, getPortfolioHealthScore, getHealthScoreColor } from "@/lib/portfolioCalculations";
import { Separator } from "@/components/ui/separator";

const PortfolioDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    if (id) {
      checkAuth();
    }
  }, [id]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchPortfolioData();
  };

  const fetchPortfolioData = async () => {
    try {
      // Get portfolio details
      const { data: portfolioData, error: portfolioError } = await supabase
        .from("portfolios")
        .select("*")
        .eq("id", id)
        .single();

      if (portfolioError) throw portfolioError;
      setPortfolio(portfolioData);

      // Get portfolio items with listings and metrics
      const { data: itemsData, error: itemsError } = await supabase
        .from("portfolio_items")
        .select(`
          listing_id,
          listings (
            id,
            property_address,
            price,
            bedrooms,
            bathrooms,
            property_type,
            listing_metrics (
              kpis,
              assumptions,
              score
            )
          )
        `)
        .eq("portfolio_id", id);

      if (itemsError) throw itemsError;

      // Flatten the data
      const dealsData = itemsData?.map(item => ({
        ...item.listings,
        listing_metrics: item.listings.listing_metrics?.[0],
      })) || [];

      setDeals(dealsData);

      // Calculate summary
      const portfolioSummary = calculatePortfolioSummary(dealsData);
      const healthScore = getPortfolioHealthScore(portfolioSummary);
      setSummary({ ...portfolioSummary, health_score: healthScore });

    } catch (error: any) {
      console.error("Error loading portfolio:", error);
      toast.error("Failed to load portfolio");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!portfolio) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Portfolio not found</p>
          <Button onClick={() => navigate("/portfolio")} className="mt-4">
            Back to Portfolios
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Helmet>
        <title>{portfolio.name} - Portfolio Analytics | YieldPilot</title>
        <meta name="description" content={`Portfolio analytics and scenario modeling for ${portfolio.name}. Track performance, run what-if scenarios, and optimize your UK property investment returns.`} />
      </Helmet>
      <div className="space-y-6 pb-20 md:pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/portfolio")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{portfolio.name}</h1>
              {portfolio.description && (
                <p className="text-muted-foreground">{portfolio.description}</p>
              )}
            </div>
          </div>
          {summary && (
            <Badge variant={getHealthScoreColor(summary.health_score) as any} className="text-lg py-2 px-4">
              Health: {summary.health_score}/100
            </Badge>
          )}
        </div>

        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Properties
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{summary.total_properties}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  Total Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(summary.total_value)}</p>
                <p className="text-xs text-muted-foreground">LTV: {formatPercentage(summary.ltv_avg)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  Portfolio Yield
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatPercentage(summary.portfolio_yield)}</p>
                <p className="text-xs text-muted-foreground">Avg: {formatPercentage(summary.avg_net_yield)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Monthly Cashflow</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${summary.net_monthly_cashflow >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(summary.net_monthly_cashflow)}
                </p>
                <p className="text-xs text-muted-foreground">Annual: {formatCurrency(summary.annual_cashflow)}</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="properties">Properties ({deals.length})</TabsTrigger>
            <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {summary && (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total Equity:</span>
                        <p className="font-medium">{formatCurrency(summary.total_equity)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Debt:</span>
                        <p className="font-medium">{formatCurrency(summary.total_debt)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Avg DSCR:</span>
                        <p className="font-medium">{summary.avg_dscr.toFixed(2)}x</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Monthly Income:</span>
                        <p className="font-medium">{formatCurrency(summary.monthly_income)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Monthly Expenses:</span>
                        <p className="font-medium">{formatCurrency(summary.monthly_expenses)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Portfolio ROI:</span>
                        <p className="font-medium">{formatPercentage(summary.portfolio_roi)}</p>
                      </div>
                    </div>

                    <Separator />

                    {(summary.properties_negative_cashflow > 0 || summary.properties_below_dscr_125 > 0) && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-warning">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="font-medium">Risk Alerts</span>
                        </div>
                        {summary.properties_negative_cashflow > 0 && (
                          <p className="text-sm text-muted-foreground">
                            {summary.properties_negative_cashflow} property(ies) with negative cashflow
                          </p>
                        )}
                        {summary.properties_below_dscr_125 > 0 && (
                          <p className="text-sm text-muted-foreground">
                            {summary.properties_below_dscr_125} property(ies) with DSCR below 1.25
                          </p>
                        )}
                      </div>
                    )}

                    {summary.best_performer && (
                      <div>
                        <p className="text-sm text-muted-foreground">Best Performer:</p>
                        <p className="font-medium">{summary.best_performer}</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            {id && <EnhancedPortfolioMetrics portfolioId={id} />}
          </TabsContent>

          <TabsContent value="properties" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{deals.length} properties in portfolio</p>
              <Button onClick={() => navigate("/deals-v2")}>
                <Plus className="h-4 w-4 mr-2" />
                Add Properties
              </Button>
            </div>

            <div className="grid gap-4">
              {deals.map((deal) => (
                <Card key={deal.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(`/deal/${deal.id}`)}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold">{deal.property_address}</h3>
                        <p className="text-sm text-muted-foreground">
                          {deal.bedrooms} bed • {deal.property_type}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(deal.price)}</p>
                        {deal.listing_metrics?.kpis?.working?.net_yield_pct && (
                          <p className="text-sm text-muted-foreground">
                            {formatPercentage(deal.listing_metrics.kpis.working.net_yield_pct)} yield
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="scenarios">
            {summary && id && (
              <ScenarioRunner 
                portfolioId={id} 
                baselineMetrics={summary}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default PortfolioDetail;
