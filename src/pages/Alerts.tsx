import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Bell, ExternalLink, Check, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AlertMatch {
  id: string;
  matched_at: string;
  is_read: boolean;
  alert_id: string;
  alerts: {
    name: string;
    alert_type: string;
  };
  deal_id: string;
}

interface Listing {
  id: string;
  property_address: string;
  price: number;
  bedrooms: number | null;
  property_type: string | null;
  listing_url: string | null;
  listing_metrics: Array<{
    score: number | null;
    kpis: any;
  }>;
}

const Alerts = () => {
  const [matches, setMatches] = useState<(AlertMatch & { listing?: Listing })[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    loadMatches();
  };

  const loadMatches = async () => {
    try {
      // Get alert matches with alert details
      const { data: matchesData, error: matchesError } = await supabase
        .from("alert_matches")
        .select(`
          *,
          alerts (
            name,
            alert_type
          )
        `)
        .order("matched_at", { ascending: false })
        .limit(50);

      if (matchesError) throw matchesError;

      // Fetch listing details for each match
      const matchesWithListings = await Promise.all(
        (matchesData || []).map(async (match) => {
          const { data: listing } = await supabase
            .from("listings")
            .select(`
              *,
              listing_metrics (
                score,
                kpis
              )
            `)
            .eq("id", match.deal_id)
            .single();

          return {
            ...match,
            listing: listing as any || undefined,
          };
        })
      );

      setMatches(matchesWithListings as any);
    } catch (error: any) {
      console.error("[Alerts] Error loading matches:", error);
      toast({
        title: "Error loading alerts",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (matchId: string) => {
    try {
      const { error } = await supabase
        .from("alert_matches")
        .update({ is_read: true })
        .eq("id", matchId);

      if (error) throw error;

      setMatches(matches.map(m => 
        m.id === matchId ? { ...m, is_read: true } : m
      ));

      toast({
        title: "Marked as read",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
    if (diffHours < 48) return "Yesterday";
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Property Alerts</h1>
            <p className="text-muted-foreground mt-1">
              New properties matching your saved searches
            </p>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const unreadCount = matches.filter(m => !m.is_read).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bell className="h-8 w-8" />
              Property Alerts
            </h1>
            <p className="text-muted-foreground mt-1">
              {unreadCount > 0 ? (
                <span className="font-semibold text-primary">
                  {unreadCount} new {unreadCount === 1 ? "match" : "matches"}
                </span>
              ) : (
                "No new matches"
              )}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/saved-searches")}
          >
            Manage Searches
          </Button>
        </div>

        {matches.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No alerts yet</h3>
              <p className="text-muted-foreground mb-4">
                Create saved searches to get notified when new properties match your criteria
              </p>
              <Button onClick={() => navigate("/saved-searches")}>
                Create Saved Search
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
              <Card
                key={match.id}
                className={`transition-all ${!match.is_read ? "border-primary bg-primary/5" : ""}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={match.is_read ? "outline" : "default"}>
                        {match.alerts?.name || "Search"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(match.matched_at)}
                      </span>
                    </div>
                    {!match.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(match.id)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Mark Read
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {match.listing ? (
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h3 className="font-semibold text-lg">
                            {match.listing.property_address}
                          </h3>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">
                            {formatCurrency(match.listing.price)}
                          </p>
                          {match.listing.listing_metrics?.[0]?.score && (
                            <Badge variant="secondary" className="mt-1">
                              Score: {match.listing.listing_metrics[0].score}/100
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        {match.listing.bedrooms && (
                          <span>{match.listing.bedrooms} bed</span>
                        )}
                        {match.listing.property_type && (
                          <Badge variant="outline">
                            {match.listing.property_type}
                          </Badge>
                        )}
                        {match.listing.listing_metrics?.[0]?.kpis?.gross_yield_pct && (
                          <span className="text-primary font-semibold">
                            {match.listing.listing_metrics[0].kpis.gross_yield_pct.toFixed(1)}% yield
                          </span>
                        )}
                      </div>

                      <Button
                        className="w-full"
                        onClick={() => navigate(`/deals-v2`)}
                      >
                        View Property
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Property details unavailable</p>
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

export default Alerts;
