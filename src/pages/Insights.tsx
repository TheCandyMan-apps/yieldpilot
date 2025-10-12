import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, DollarSign, Home, BarChart3, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface MarketInsight {
  id: string;
  city: string;
  postcode_prefix?: string;
  avg_price?: number;
  avg_rent?: number;
  avg_yield?: number;
  avg_roi?: number;
  growth_forecast_1yr?: number;
  growth_forecast_5yr?: number;
  sample_size: number;
}

const Insights = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<MarketInsight[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchInsights();
  };

  const fetchInsights = async () => {
    try {
      const { data, error } = await supabase
        .from("market_insights")
        .select("*")
        .order("city", { ascending: true });

      if (error) throw error;

      setInsights(data || []);
    } catch (error: any) {
      toast.error("Error loading market insights: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-market-insights");
      
      if (error) throw error;

      toast.success("Market insights generated successfully");
      fetchInsights();
    } catch (error: any) {
      toast.error("Error generating insights: " + error.message);
    } finally {
      setRefreshing(false);
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

  const filteredInsights = selectedCity === "all"
    ? insights
    : insights.filter((i) => i.city === selectedCity);

  const cities = ["all", ...Array.from(new Set(insights.map((i) => i.city)))];

  // Calculate overall stats
  const totalProperties = insights.reduce((sum, i) => sum + i.sample_size, 0);
  const avgYieldOverall = insights.length > 0
    ? insights.reduce((sum, i) => sum + (i.avg_yield || 0), 0) / insights.length
    : 0;
  const avgPriceOverall = insights.length > 0
    ? insights.reduce((sum, i) => sum + (i.avg_price || 0), 0) / insights.length
    : 0;
  const avgRentOverall = insights.length > 0
    ? insights.reduce((sum, i) => sum + (i.avg_rent || 0), 0) / insights.length
    : 0;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Market Insights</h1>
            <p className="text-muted-foreground mt-1">
              AI-powered regional analysis and trends
            </p>
          </div>
          <Button onClick={generateInsights} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Generating..." : "Generate Insights"}
          </Button>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Property Price</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(avgPriceOverall)}</div>
              <p className="text-xs text-muted-foreground">Across all regions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Monthly Rent</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(avgRentOverall)}</div>
              <p className="text-xs text-muted-foreground">Per month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Yield</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgYieldOverall.toFixed(2)}%</div>
              <p className="text-xs text-muted-foreground">Annual return</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Properties Analyzed</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProperties}</div>
              <p className="text-xs text-muted-foreground">Data points</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Filter by city:</span>
          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {cities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city === "all" ? "All Cities" : city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Regional Data */}
        {filteredInsights.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No insights available</h3>
              <p className="text-muted-foreground mb-4">
                Generate market insights to see regional trends and forecasts
              </p>
              <Button onClick={generateInsights} disabled={refreshing}>
                Generate Insights
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInsights.map((insight) => (
              <Card key={insight.id}>
                <CardHeader>
                  <CardTitle>{insight.city}</CardTitle>
                  <CardDescription>
                    {insight.postcode_prefix && `${insight.postcode_prefix} • `}
                    {insight.sample_size} properties
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Avg Price</p>
                      <p className="font-semibold">{formatCurrency(insight.avg_price)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Avg Rent</p>
                      <p className="font-semibold">{formatCurrency(insight.avg_rent)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Avg Yield</p>
                      <p className="font-semibold text-green-600">
                        {insight.avg_yield?.toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Avg ROI</p>
                      <p className="font-semibold text-blue-600">
                        {insight.avg_roi?.toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  {(insight.growth_forecast_1yr || insight.growth_forecast_5yr) && (
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium mb-2">Growth Forecast</p>
                      <div className="space-y-2">
                        {insight.growth_forecast_1yr && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">1 Year</span>
                            <div className="flex items-center">
                              {insight.growth_forecast_1yr > 0 ? (
                                <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                              ) : (
                                <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                              )}
                              <span className={`text-sm font-semibold ${
                                insight.growth_forecast_1yr > 0 ? "text-green-600" : "text-red-600"
                              }`}>
                                {insight.growth_forecast_1yr > 0 ? "+" : ""}
                                {insight.growth_forecast_1yr.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        )}
                        {insight.growth_forecast_5yr && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">5 Year</span>
                            <div className="flex items-center">
                              {insight.growth_forecast_5yr > 0 ? (
                                <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                              ) : (
                                <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                              )}
                              <span className={`text-sm font-semibold ${
                                insight.growth_forecast_5yr > 0 ? "text-green-600" : "text-red-600"
                              }`}>
                                {insight.growth_forecast_5yr > 0 ? "+" : ""}
                                {insight.growth_forecast_5yr.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Insights;
