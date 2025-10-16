import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, TrendingUp, TrendingDown, Activity, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AreaAnalytic {
  id: string;
  postcode_prefix: string;
  city: string;
  avg_yield_current: number;
  avg_price_current: number;
  price_growth_1yr: number;
  price_growth_5yr_forecast: number;
  rental_growth_1yr: number;
  transaction_volume: number;
  opportunity_score: number;
  market_gap_indicator: string | null;
  confidence_score: number;
}

const AreaInsights = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AreaAnalytic[]>([]);
  const [sortBy, setSortBy] = useState<"yield" | "growth" | "opportunity">("opportunity");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    await fetchAnalytics();
  };

  const fetchAnalytics = async () => {
    try {
      const { data, error } = await supabase
        .from("area_analytics")
        .select("*")
        .order("opportunity_score", { ascending: false });

      if (error) throw error;
      setAnalytics(data || []);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "N/A";
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getSortedAnalytics = () => {
    const sorted = [...analytics];
    switch (sortBy) {
      case "yield":
        return sorted.sort((a, b) => (b.avg_yield_current || 0) - (a.avg_yield_current || 0));
      case "growth":
        return sorted.sort((a, b) => (b.price_growth_5yr_forecast || 0) - (a.price_growth_5yr_forecast || 0));
      case "opportunity":
      default:
        return sorted.sort((a, b) => (b.opportunity_score || 0) - (a.opportunity_score || 0));
    }
  };

  const getOpportunityColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 60) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <MapPin className="h-8 w-8 text-primary" />
              Area Intelligence Heatmap
            </h1>
            <p className="text-muted-foreground mt-1">
              ML-powered predictive analytics across UK property markets
            </p>
          </div>
          <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="opportunity">Opportunity Score</SelectItem>
              <SelectItem value="yield">Current Yield</SelectItem>
              <SelectItem value="growth">5Y Growth Forecast</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {analytics.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Area Analytics Available</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Area analytics are generated from deal data. As more properties are analyzed, 
                our ML models will provide predictive insights for different regions.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {getSortedAnalytics().map((area) => (
              <Card key={area.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{area.city}</CardTitle>
                      <CardDescription>{area.postcode_prefix}</CardDescription>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-semibold ${getOpportunityColor(area.opportunity_score)}`}>
                      {area.opportunity_score}/100
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Current Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Avg Yield</p>
                      <p className="text-lg font-semibold text-primary">
                        {area.avg_yield_current?.toFixed(2)}%
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Avg Price</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(area.avg_price_current)}
                      </p>
                    </div>
                  </div>

                  {/* Growth Forecasts */}
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">1Y Price Growth</span>
                      <span className={`flex items-center gap-1 text-sm font-medium ${
                        (area.price_growth_1yr || 0) > 0 ? "text-green-600" : "text-red-600"
                      }`}>
                        {(area.price_growth_1yr || 0) > 0 ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                        {area.price_growth_1yr?.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">5Y Forecast</span>
                      <span className={`flex items-center gap-1 text-sm font-medium ${
                        (area.price_growth_5yr_forecast || 0) > 0 ? "text-green-600" : "text-red-600"
                      }`}>
                        {(area.price_growth_5yr_forecast || 0) > 0 ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                        {area.price_growth_5yr_forecast?.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Rental Growth</span>
                      <span className="text-sm font-medium text-primary">
                        +{area.rental_growth_1yr?.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Market Activity */}
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Activity className="h-4 w-4" />
                        Activity
                      </span>
                      <span className="font-medium">{area.transaction_volume} deals</span>
                    </div>
                  </div>

                  {/* Market Gap Indicator */}
                  {area.market_gap_indicator && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-primary font-medium">
                        💡 {area.market_gap_indicator}
                      </p>
                    </div>
                  )}

                  {/* ML Confidence */}
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>ML Confidence</span>
                      <span>{(area.confidence_score * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AreaInsights;
