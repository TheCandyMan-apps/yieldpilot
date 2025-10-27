import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";

interface SavedSearch {
  id: string;
  name: string;
  criteria: any;
  frequency: string;
  is_active: boolean;
  last_run_at: string | null;
  created_at: string;
}

export default function SavedSearches() {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSearches();
  }, []);

  async function loadSearches() {
    try {
      const { data, error } = await supabase
        .from("saved_searches")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSearches(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading searches",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(id: string, currentActive: boolean) {
    try {
      const { error } = await supabase
        .from("saved_searches")
        .update({ is_active: !currentActive })
        .eq("id", id);

      if (error) throw error;

      setSearches(
        searches.map((s) =>
          s.id === id ? { ...s, is_active: !currentActive } : s
        )
      );

      toast({
        title: currentActive ? "Alerts disabled" : "Alerts enabled",
        description: `This search will ${currentActive ? "no longer" : "now"} send you alerts.`,
      });
    } catch (error: any) {
      toast({
        title: "Error updating search",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  async function deleteSearch(id: string) {
    try {
      const { error } = await supabase
        .from("saved_searches")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setSearches(searches.filter((s) => s.id !== id));

      toast({
        title: "Search deleted",
        description: "Your saved search has been removed.",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting search",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg" />
          <div className="h-32 bg-muted rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Saved Searches</h1>
            <p className="text-muted-foreground">
              Manage your saved searches and alerts
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Search
          </Button>
        </div>

        {searches.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No saved searches</CardTitle>
              <CardDescription>
                Save your first search to get notified about new matching deals.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4">
            {searches.map((search) => (
              <Card key={search.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">{search.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={search.is_active ? "default" : "secondary"}>
                          {search.is_active ? "Active" : "Paused"}
                        </Badge>
                        <Badge variant="outline">{search.frequency}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleActive(search.id, search.is_active)}
                      >
                        {search.is_active ? (
                          <BellOff className="h-4 w-4" />
                        ) : (
                          <Bell className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteSearch(search.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    {search.last_run_at ? (
                      <>Last checked: {new Date(search.last_run_at).toLocaleDateString()}</>
                    ) : (
                      "Never run"
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
