import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, AlertCircle, ThumbsUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface Recommendation {
  id: string;
  type: "opportunity" | "alert" | "tip";
  title: string;
  description: string;
  dealId?: string;
  actionLabel?: string;
  actionUrl?: string;
}

export function SmartRecommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Load user's investor profile for personalized recommendations
      const { data: profile } = await supabase
        .from("investor_profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      // Get recent deals that match user preferences
      const { data: deals } = await supabase
        .from("deals_feed")
        .select("*")
        .eq("is_active", true)
        .gte("yield_percentage", profile?.preferred_yield_min || 6)
        .lte("yield_percentage", profile?.preferred_yield_max || 12)
        .order("created_at", { ascending: false })
        .limit(5);

      const recs: Recommendation[] = [];

      // Generate recommendations based on deals
      deals?.forEach((deal) => {
        if (deal.yield_percentage && deal.yield_percentage > 8) {
          recs.push({
            id: `deal-${deal.id}`,
            type: "opportunity",
            title: `High Yield Property: ${deal.yield_percentage.toFixed(1)}%`,
            description: `${deal.property_address} offers excellent rental yield`,
            dealId: deal.id,
            actionLabel: "View Deal",
            actionUrl: `/deal/${deal.id}`,
          });
        }

        if (deal.roi_percentage && deal.roi_percentage > 15) {
          recs.push({
            id: `roi-${deal.id}`,
            type: "opportunity",
            title: `Strong ROI Potential: ${deal.roi_percentage.toFixed(1)}%`,
            description: deal.property_address,
            dealId: deal.id,
            actionLabel: "Analyze",
            actionUrl: `/deal/${deal.id}`,
          });
        }
      });

      // Add general tips
      if (!profile) {
        recs.push({
          id: "setup-profile",
          type: "tip",
          title: "Complete your investor profile",
          description: "Get personalized deal recommendations by setting your preferences",
          actionLabel: "Setup Profile",
          actionUrl: "/investor-profile",
        });
      }

      setRecommendations(recs.slice(0, 5));
    } catch (error) {
      console.error("Failed to load recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: Recommendation["type"]) => {
    switch (type) {
      case "opportunity":
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case "alert":
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case "tip":
        return <ThumbsUp className="h-5 w-5 text-blue-500" />;
    }
  };

  const getVariant = (type: Recommendation["type"]) => {
    switch (type) {
      case "opportunity":
        return "default";
      case "alert":
        return "destructive";
      case "tip":
        return "secondary";
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-20 bg-muted rounded" />
        </div>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No recommendations available yet
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Smart Recommendations</h3>
      </div>
      <div className="space-y-3">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className="flex items-start gap-3 p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors"
          >
            {getIcon(rec.type)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium">{rec.title}</p>
                <Badge variant={getVariant(rec.type)} className="text-xs">
                  {rec.type}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {rec.description}
              </p>
            </div>
            {rec.actionUrl && (
              <Link to={rec.actionUrl}>
                <Button size="sm" variant="ghost">
                  {rec.actionLabel || "View"}
                </Button>
              </Link>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
