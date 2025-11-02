import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building, MapPin, Users, FileText, Lock, Loader2 } from "lucide-react";

interface PremiumDataPanelProps {
  listingId: string;
  region: string;
}

export function PremiumDataPanel({ listingId, region }: PremiumDataPanelProps) {
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [data, setData] = useState<Record<string, any>>({});

  const checkCredits = async () => {
    const { data: creditData } = await supabase
      .from("premium_credits")
      .select("credits_remaining")
      .eq("credit_type", "premium_data")
      .gte("period_end", new Date().toISOString())
      .order("period_end", { ascending: false })
      .limit(1)
      .maybeSingle();

    setCredits(creditData?.credits_remaining || 0);
  };

  const queryPremiumData = async (queryType: string) => {
    if (data[queryType]) return; // Already loaded

    try {
      setLoading(true);
      const { data: result, error } = await supabase.functions.invoke("premium-data-query", {
        body: { listing_id: listingId, query_type: queryType },
      });

      if (error) throw error;

      if (result.requires_upgrade) {
        toast.error("Insufficient credits. Please purchase more credits.", {
          action: {
            label: "Buy Credits",
            onClick: () => window.location.href = "/billing",
          },
        });
        return;
      }

      setData(prev => ({ ...prev, [queryType]: result.data }));
      setCredits(result.credits_remaining);
      toast.success(`Premium data loaded. ${result.credits_remaining} credits remaining.`);
    } catch (error: any) {
      console.error("Error fetching premium data:", error);
      toast.error(error.message || "Failed to fetch premium data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Premium Data Insights</CardTitle>
            <CardDescription>Unlock ownership, zoning & demographic data</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={checkCredits}>
            {credits !== null ? `${credits} Credits` : "Check Credits"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="ownership">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="ownership">Ownership</TabsTrigger>
            <TabsTrigger value="zoning">Zoning</TabsTrigger>
            <TabsTrigger value="demographics">Demographics</TabsTrigger>
            <TabsTrigger value="planning">Planning</TabsTrigger>
          </TabsList>

          <TabsContent value="ownership" className="space-y-4">
            {!data.ownership ? (
              <div className="text-center py-8">
                <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Unlock ownership data</p>
                <Button onClick={() => queryPremiumData("ownership")} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Query (1 credit)
                </Button>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground">Title Number:</span>
                    <p className="font-medium">{data.ownership.title_number}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Owner Type:</span>
                    <p className="font-medium">{data.ownership.owner_type}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tenure:</span>
                    <p className="font-medium">{data.ownership.tenure}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Purchase Date:</span>
                    <p className="font-medium">{data.ownership.purchase_date}</p>
                  </div>
                </div>
                {data.ownership.mortgage_details && (
                  <div className="pt-2 border-t">
                    <p className="text-muted-foreground mb-2">Mortgage Details:</p>
                    <p className="font-medium">Lender: {data.ownership.mortgage_details.lender}</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="zoning" className="space-y-4">
            {!data.zoning ? (
              <div className="text-center py-8">
                <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Unlock zoning data</p>
                <Button onClick={() => queryPremiumData("zoning")} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Query (1 credit)
                </Button>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Current Use Class:</span>
                  <p className="font-medium">{data.zoning.current_use_class}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Permitted Uses:</span>
                  <ul className="list-disc list-inside">
                    {data.zoning.permitted_uses?.map((use: string, idx: number) => (
                      <li key={idx}>{use}</li>
                    ))}
                  </ul>
                </div>
                {data.zoning.restrictions?.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Restrictions:</span>
                    <ul className="list-disc list-inside text-warning">
                      {data.zoning.restrictions.map((r: string, idx: number) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="demographics" className="space-y-4">
            {!data.demographics ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Unlock demographic data</p>
                <Button onClick={() => queryPremiumData("demographics")} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Query (1 credit)
                </Button>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground">Median Income:</span>
                    <p className="font-medium">£{data.demographics.area_stats?.median_income?.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Population Growth:</span>
                    <p className="font-medium">{data.demographics.area_stats?.population_growth_5yr}%</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Employment Rate:</span>
                    <p className="font-medium">{data.demographics.area_stats?.employment_rate}%</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Crime Rate:</span>
                    <Badge variant="secondary">{data.demographics.area_stats?.crime_rate}</Badge>
                  </div>
                </div>
                {data.demographics.market_demand && (
                  <div className="pt-2 border-t">
                    <p className="text-muted-foreground mb-2">Market Demand:</p>
                    <p className="text-sm">Rental: <Badge>{data.demographics.market_demand.rental_demand}</Badge></p>
                    <p className="text-sm mt-1">Avg Days to Let: {data.demographics.market_demand.days_to_let_avg}</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="planning" className="space-y-4">
            {!data.planning ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Unlock planning data</p>
                <Button onClick={() => queryPremiumData("planning")} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Query (1 credit)
                </Button>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                {data.planning.planning_history?.length > 0 && (
                  <div>
                    <p className="text-muted-foreground mb-2">Planning History:</p>
                    {data.planning.planning_history.map((app: any, idx: number) => (
                      <div key={idx} className="p-2 bg-muted rounded mb-2">
                        <p className="font-medium">{app.reference}</p>
                        <p className="text-xs">{app.description}</p>
                        <Badge variant="secondary" className="mt-1">{app.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
                {data.planning.nearby_applications?.length > 0 && (
                  <div>
                    <p className="text-muted-foreground mb-2">Nearby Applications:</p>
                    {data.planning.nearby_applications.map((app: any, idx: number) => (
                      <div key={idx} className="p-2 bg-muted rounded mb-2">
                        <p className="font-medium">{app.description}</p>
                        <p className="text-xs">Distance: {app.distance}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
