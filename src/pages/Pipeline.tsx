import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KanbanSquare, ExternalLink, Trash2, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface PipelineDeal {
  id: string;
  deal_id: string;
  stage: string;
  priority: string;
  notes: string | null;
  moved_at: string;
  deal: {
    property_address: string;
    price: number;
    city: string;
    yield_percentage?: number;
  };
}

const stages = [
  { id: "prospect", label: "Prospects", color: "bg-blue-100 dark:bg-blue-950" },
  { id: "viewing", label: "Viewing", color: "bg-purple-100 dark:bg-purple-950" },
  { id: "offer", label: "Offer Made", color: "bg-yellow-100 dark:bg-yellow-950" },
  { id: "due_diligence", label: "Due Diligence", color: "bg-orange-100 dark:bg-orange-950" },
  { id: "closing", label: "Closing", color: "bg-green-100 dark:bg-green-950" },
  { id: "completed", label: "Completed", color: "bg-gray-100 dark:bg-gray-950" },
];

const priorities = [
  { id: "low", label: "Low", color: "secondary" },
  { id: "medium", label: "Medium", color: "default" },
  { id: "high", label: "High", color: "destructive" },
];

export default function Pipeline() {
  const [deals, setDeals] = useState<PipelineDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPipeline();
  }, []);

  const loadPipeline = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const { data, error } = await supabase
        .from("deal_pipeline")
        .select(`
          *,
          deals_feed (
            property_address,
            price,
            city,
            yield_percentage
          )
        `)
        .eq("user_id", session.session.user.id)
        .order("moved_at", { ascending: false });

      if (error) throw error;

      const formattedDeals = (data || []).map((item: any) => ({
        ...item,
        deal: item.deals_feed,
      }));

      setDeals(formattedDeals);
    } catch (error) {
      console.error("Failed to load pipeline:", error);
      toast({
        title: "Failed to load pipeline",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const moveDeal = async (dealId: string, newStage: string) => {
    const { error } = await supabase
      .from("deal_pipeline")
      .update({ stage: newStage, moved_at: new Date().toISOString() })
      .eq("id", dealId);

    if (error) {
      toast({
        title: "Failed to move deal",
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Deal moved successfully" });
    loadPipeline();
  };

  const updatePriority = async (dealId: string, priority: string) => {
    const { error } = await supabase
      .from("deal_pipeline")
      .update({ priority })
      .eq("id", dealId);

    if (error) {
      toast({
        title: "Failed to update priority",
        variant: "destructive",
      });
      return;
    }

    loadPipeline();
  };

  const updateNotes = async (dealId: string, notes: string) => {
    const { error } = await supabase
      .from("deal_pipeline")
      .update({ notes })
      .eq("id", dealId);

    if (error) {
      toast({
        title: "Failed to update notes",
        variant: "destructive",
      });
    }
  };

  const removeDeal = async (dealId: string) => {
    const { error } = await supabase
      .from("deal_pipeline")
      .delete()
      .eq("id", dealId);

    if (error) {
      toast({
        title: "Failed to remove deal",
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Deal removed from pipeline" });
    loadPipeline();
  };

  const getDealsByStage = (stageId: string) => {
    return deals.filter((deal) => deal.stage === stageId);
  };

  const getPriorityColor = (priority: string) => {
    return priorities.find((p) => p.id === priority)?.color || "default";
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-muted rounded" />
            ))}
          </div>
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
              <KanbanSquare className="h-8 w-8" />
              Deal Pipeline
            </h1>
            <p className="text-muted-foreground">
              Manage your deals through each stage
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            {deals.length} deals in pipeline
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {stages.map((stage) => {
            const stageDeals = getDealsByStage(stage.id);
            return (
              <Card key={stage.id} className={`${stage.color} p-4`}>
                <div className="mb-4">
                  <h3 className="font-semibold mb-1">{stage.label}</h3>
                  <p className="text-xs text-muted-foreground">
                    {stageDeals.length} deals
                  </p>
                </div>

                <div className="space-y-3">
                  {stageDeals.map((deal) => (
                    <Card key={deal.id} className="p-3 bg-background">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <Link to={`/deal/${deal.deal_id}`}>
                              <p className="text-sm font-medium line-clamp-2 hover:text-primary">
                                {deal.deal.property_address}
                              </p>
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              £{deal.deal.price.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Badge
                            variant={getPriorityColor(deal.priority) as any}
                            className="text-xs"
                          >
                            {deal.priority}
                          </Badge>
                          {deal.deal.yield_percentage && (
                            <Badge variant="outline" className="text-xs">
                              {deal.deal.yield_percentage.toFixed(1)}%
                            </Badge>
                          )}
                        </div>

                        <Select
                          value={deal.stage}
                          onValueChange={(value) => moveDeal(deal.id, value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {stages.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={deal.priority}
                          onValueChange={(value) => updatePriority(deal.id, value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {priorities.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Textarea
                          placeholder="Add notes..."
                          value={deal.notes || ""}
                          onChange={(e) => updateNotes(deal.id, e.target.value)}
                          className="text-xs min-h-[60px]"
                        />

                        <div className="flex gap-1">
                          <Link to={`/deal/${deal.deal_id}`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDeal(deal.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {stageDeals.length === 0 && (
                    <p className="text-xs text-center text-muted-foreground py-8">
                      No deals in this stage
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
