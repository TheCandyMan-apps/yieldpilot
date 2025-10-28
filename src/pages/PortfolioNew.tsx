import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Home } from "lucide-react";
import { toast } from "sonner";
import { PortfolioCard } from "@/components/portfolio/PortfolioCard";
import { calculatePortfolioSummary } from "@/lib/portfolioCalculations";

interface Portfolio {
  id: string;
  name: string;
  description?: string;
  total_value?: number;
  total_roi?: number;
  created_at: string;
}

interface PortfolioWithSummary {
  portfolio: Portfolio;
  summary: any;
}

const PortfolioNew = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [portfolios, setPortfolios] = useState<PortfolioWithSummary[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPortfolio, setNewPortfolio] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchPortfolios(user.id);
  };

  const fetchPortfolios = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("portfolios")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch deals for each portfolio to calculate summaries
      const portfoliosWithSummaries = await Promise.all(
        (data || []).map(async (portfolio) => {
          const { data: itemsData } = await supabase
            .from("portfolio_items")
            .select(`
              listing_id,
              listings (
                id,
                property_address,
                price,
                listing_metrics (
                  kpis,
                  assumptions
                )
              )
            `)
            .eq("portfolio_id", portfolio.id);

          const deals = itemsData?.map(item => ({
            ...item.listings,
            listing_metrics: item.listings.listing_metrics?.[0],
          })) || [];

          const summary = calculatePortfolioSummary(deals);
          return { portfolio, summary };
        })
      );

      setPortfolios(portfoliosWithSummaries);
    } catch (error: any) {
      toast.error("Error loading portfolios: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePortfolio = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("portfolios")
        .insert({
          user_id: user.id,
          name: newPortfolio.name,
          description: newPortfolio.description,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Portfolio created successfully");
      setShowCreateDialog(false);
      setNewPortfolio({ name: "", description: "" });
      fetchPortfolios(user.id);
    } catch (error: any) {
      toast.error("Error creating portfolio: " + error.message);
    }
  };

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
      <div className="space-y-6 pb-20 md:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Portfolio Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Track performance and manage your property investments
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Portfolio
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Portfolio</DialogTitle>
                <DialogDescription>
                  Organize your properties into portfolios
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Portfolio Name</Label>
                  <Input
                    placeholder="e.g., Buy-to-Let Properties"
                    value={newPortfolio.name}
                    onChange={(e) => setNewPortfolio({ ...newPortfolio, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Description (Optional)</Label>
                  <Textarea
                    placeholder="Describe this portfolio..."
                    value={newPortfolio.description}
                    onChange={(e) => setNewPortfolio({ ...newPortfolio, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePortfolio} disabled={!newPortfolio.name}>
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {portfolios.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Home className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No portfolios yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first portfolio to start tracking investments
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Portfolio
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {portfolios.map(({ portfolio, summary }) => (
              <PortfolioCard key={portfolio.id} portfolio={portfolio} summary={summary} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PortfolioNew;
