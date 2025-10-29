import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { Activity, Building2, TrendingUp, FileText, DollarSign } from "lucide-react";

interface ActivityItem {
  id: string;
  action: string;
  resource_type: "deal" | "forecast" | "export" | "payment";
  resource_id?: string;
  metadata?: any;
  created_at: string;
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const { data } = await supabase
        .from("user_activity")
        .select("*")
        .eq("user_id", session.session.user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (data) {
        setActivities(data.map(item => ({
          id: item.id,
          action: item.action_type || item.action || '',
          resource_type: (item.resource_type || 'deal') as any,
          resource_id: item.resource_id,
          metadata: item.metadata,
          created_at: item.created_at
        })));
      }
    } catch (error) {
      console.error("Failed to load activity:", error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: ActivityItem["resource_type"]) => {
    switch (type) {
      case "deal":
        return Building2;
      case "forecast":
        return TrendingUp;
      case "export":
        return FileText;
      case "payment":
        return DollarSign;
      default:
        return Activity;
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes("create")) return "text-green-500";
    if (action.includes("update")) return "text-blue-500";
    if (action.includes("delete")) return "text-red-500";
    return "text-muted-foreground";
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted rounded" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Recent Activity</h3>
      </div>
      <ScrollArea className="h-[400px]">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No activity yet
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => {
              const Icon = getIcon(activity.resource_type);
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-md hover:bg-accent transition-colors"
                >
                  <div className="mt-1">
                    <Icon className={`h-4 w-4 ${getActionColor(activity.action)}`} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm">
                      <span className="font-medium capitalize">
                        {activity.action.replace("_", " ")}
                      </span>
                      {" "}
                      <span className="text-muted-foreground">
                        {activity.resource_type}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}
