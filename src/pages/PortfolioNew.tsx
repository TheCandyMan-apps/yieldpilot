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
import { Plus, TrendingUp, TrendingDown, DollarSign, Home, Users, BarChart3, Eye } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Portfolio {
  id: string;
  name: string;
  description?: string;
  total_value?: number;
  total_roi?: number;
  created_at: string;
}

interface PortfolioPerformance {
  date: string;
  total_value: number;
  monthly_income?: number;
  monthly_expenses?: number;
  health_score?: number;
}

const PortfolioNew = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [performance, setPerformance] = useState<PortfolioPerformance[]>([]);
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
      setPortfolios(data || []);
      
      if (data && data.length > 0) {
        setSelectedPortfolio(data[0]);
        fetchPerformance(data[0].id);
      }
    } catch (error: any) {
      toast.error("Error loading portfolios: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPerformance = async (portfolioId: string) => {
    try {
      const { data, error } = await supabase
        .from("portfolio_performance")
        .select("*")
        .eq("portfolio_id", portfolioId)
        .order("date", { ascending: false })
        .limit(30);

      if (error) throw error;
      setPerformance(data || []);
    } catch (error: any) {
      console.error("Error loading performance:", error);
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

  const calculateHealthScore = () => {
    if (!performance || performance.length === 0) return null;
    const latest = performance[0];
    return latest.health_score || 75; // Default score if not calculated
  };

  const calculateTrend = () => {
    if (performance.length < 2) return 0;
    const latest = performance[0].total_value;
    const previous = performance[1].total_value;
    return ((latest - previous) / previous) * 100;
  };

  const formatCurrency = (value?: number) => {
    if (!value) return "£0";
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
    }).format(value);
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

  const healthScore = calculateHealthScore();
  const trend = calculateTrend();

  return (
    <DashboardLayout>
      <div className="space-y-6">
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
          <>
            {/* Portfolio Selector */}
            {portfolios.length > 1 && (
              <Tabs
                value={selectedPortfolio?.id}
                onValueChange={(id) => {
                  const portfolio = portfolios.find((p) => p.id === id);
                  if (portfolio) {
                    setSelectedPortfolio(portfolio);
                    fetchPerformance(portfolio.id);
                  }
                }}
              >
                <TabsList>
                  {portfolios.map((portfolio) => (
                    <TabsTrigger key={portfolio.id} value={portfolio.id}>
                      {portfolio.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}

            {/* Portfolio Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(selectedPortfolio?.total_value)}
                  </div>
                  {trend !== 0 && (
                    <p className={`text-xs flex items-center mt-1 ${trend > 0 ? "text-green-600" : "text-red-600"}`}>
                      {trend > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                      {Math.abs(trend).toFixed(2)}% vs last period
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">ROI</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {selectedPortfolio?.total_roi?.toFixed(2) || "0.00"}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Return on investment
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Health Score</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {healthScore ? `${healthScore}/100` : "N/A"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Portfolio health
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Properties</CardTitle>
                  <Home className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total properties
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Performance Chart Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Over Time</CardTitle>
                <CardDescription>Track your portfolio value and income</CardDescription>
              </CardHeader>
              <CardContent>
                {performance.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No performance data yet</p>
                    <p className="text-sm mt-2">Add properties to your portfolio to see trends</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {performance.slice(0, 5).map((perf) => (
                      <div key={perf.date} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">{new Date(perf.date).toLocaleDateString()}</p>
                          <p className="text-sm text-muted-foreground">
                            {perf.health_score && `Health: ${perf.health_score}/100`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(perf.total_value)}</p>
                          {perf.monthly_income && (
                            <p className="text-sm text-green-600">+{formatCurrency(perf.monthly_income)}/mo</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Team Members Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Team Members
                    </CardTitle>
                    <CardDescription>Collaborate with your team</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Invite
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Team collaboration features available on Pro plan and above
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PortfolioNew;
