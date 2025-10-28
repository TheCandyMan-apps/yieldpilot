import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Bed, Bath, Home, TrendingUp, DollarSign } from "lucide-react";
import { CopilotPanel } from "@/components/copilot/CopilotPanel";
import { CapexBuilder } from "@/components/capex/CapexBuilder";
import { ComplianceTab } from "@/components/compliance/ComplianceTab";
import { formatCurrency, formatPercentage } from "@/lib/portfolioCalculations";

const DealDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [deal, setDeal] = useState<any>(null);

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
    fetchDeal();
  };

  const fetchDeal = async () => {
    try {
      const { data, error } = await supabase
        .from("listings")
        .select(`
          *,
          listing_metrics (
            kpis,
            assumptions,
            enrichment,
            score,
            drivers,
            risks,
            capex_total,
            capex_breakdown,
            capex_annual_reserve
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        toast.error("Deal not found");
        navigate("/deals-v2");
        return;
      }

      setDeal({
        listing: data,
        metrics: data.listing_metrics?.[0],
        enrichment: data.listing_metrics?.[0]?.enrichment,
      });
    } catch (error: any) {
      console.error("Error loading deal:", error);
      toast.error("Failed to load deal");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCapex = async (total: number, breakdown: any[], annualReserve: number, updatedKPIs: any) => {
    try {
      const { error } = await supabase
        .from("listing_metrics")
        .update({
          capex_total: total,
          capex_breakdown: breakdown,
          capex_annual_reserve: annualReserve,
          kpis: updatedKPIs,
        })
        .eq("listing_id", id);

      if (error) throw error;
      
      toast.success("CapEx applied successfully");
      fetchDeal(); // Refresh data
    } catch (error: any) {
      console.error("Error applying CapEx:", error);
      toast.error("Failed to apply CapEx");
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

  if (!deal) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Deal not found</p>
          <Button onClick={() => navigate("/deals-v2")} className="mt-4">
            Back to Deals
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const { listing, metrics, enrichment } = deal;
  const kpis = metrics?.kpis?.working;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/deals-v2")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{listing.property_address}</h1>
            <div className="flex items-center gap-4 text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {listing.postcode}
              </span>
              {listing.bedrooms && (
                <span className="flex items-center gap-1">
                  <Bed className="h-4 w-4" />
                  {listing.bedrooms} bed
                </span>
              )}
              {listing.bathrooms && (
                <span className="flex items-center gap-1">
                  <Bath className="h-4 w-4" />
                  {listing.bathrooms} bath
                </span>
              )}
              {listing.property_type && (
                <span className="flex items-center gap-1">
                  <Home className="h-4 w-4" />
                  {listing.property_type}
                </span>
              )}
            </div>
          </div>
          {metrics?.score && (
            <Badge variant="secondary" className="text-lg py-2 px-4">
              Score: {metrics.score}/100
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Price
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(listing.price)}</p>
            </CardContent>
          </Card>

          {kpis?.net_yield_pct && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  Net Yield
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatPercentage(kpis.net_yield_pct)}</p>
              </CardContent>
            </Card>
          )}

          {kpis?.net_monthly_cashflow !== undefined && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Monthly Cashflow</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${kpis.net_monthly_cashflow >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(kpis.net_monthly_cashflow)}
                </p>
              </CardContent>
            </Card>
          )}

          {kpis?.dscr && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">DSCR</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${kpis.dscr >= 1.25 ? 'text-success' : 'text-warning'}`}>
                  {kpis.dscr.toFixed(2)}x
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="capex">CapEx</TabsTrigger>
                <TabsTrigger value="compliance">Compliance</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Key Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {kpis && (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Monthly Rental Income:</span>
                          <p className="font-medium">{formatCurrency(kpis.monthly_rental_income || 0)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Monthly Mortgage:</span>
                          <p className="font-medium">{formatCurrency(kpis.monthly_mortgage || 0)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Operating Costs:</span>
                          <p className="font-medium">{formatCurrency(kpis.monthly_operating_costs || 0)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Investment:</span>
                          <p className="font-medium">{formatCurrency(kpis.total_investment || 0)}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {metrics?.drivers && metrics.drivers.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Key Drivers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {metrics.drivers.map((driver: string, idx: number) => (
                          <li key={idx}>{driver}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {metrics?.risks && metrics.risks.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Risk Factors</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc list-inside space-y-1 text-sm text-warning">
                        {metrics.risks.map((risk: string, idx: number) => (
                          <li key={idx}>{risk}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="capex">
                <CapexBuilder
                  currentKPIs={metrics?.kpis}
                  assumptions={metrics?.assumptions}
                  propertyPrice={listing.price}
                  onApplyCapex={handleApplyCapex}
                />
              </TabsContent>

              <TabsContent value="compliance">
                <ComplianceTab
                  listingId={listing.id}
                  enrichment={enrichment}
                  propertyData={listing}
                />
              </TabsContent>
            </Tabs>
          </div>

          <div>
            <CopilotPanel 
              dealData={deal}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DealDetail;
