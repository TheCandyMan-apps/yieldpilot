import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardLayout from "@/components/DashboardLayout";
import { TrendingUp, Briefcase, Eye, BarChart3, ArrowRight, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import PropertyAnalysisForm from "@/components/PropertyAnalysisForm";
import AnalysisResults from "@/components/AnalysisResults";
import AnalysisHistory from "@/components/AnalysisHistory";
import { Link } from "react-router-dom";
import { SmartRecommendations } from "@/components/ai/SmartRecommendations";
import { GlobalYieldExplorer } from "@/components/dashboard/GlobalYieldExplorer";
import { isEnabled } from "@/config/flags";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingAnalysis, setEditingAnalysis] = useState<any>(null);
  const [stats, setStats] = useState({
    totalAnalyses: 0,
    watchlistCount: 0,
    activeDeals: 0,
  });

  useEffect(() => {
    checkAuth();
  }, [navigate]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    } else {
      setUser(session.user);
      fetchStats(session.user.id);
      setLoading(false);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  };

  const fetchStats = async (userId: string) => {
    try {
      const [analysesData, watchlistData, dealsData] = await Promise.all([
        supabase.from("property_analyses").select("id", { count: "exact" }).eq("user_id", userId),
        supabase.from("watchlist").select("id", { count: "exact" }).eq("user_id", userId),
        supabase.from("deals_feed").select("id", { count: "exact" }).eq("is_active", true),
      ]);

      setStats({
        totalAnalyses: analysesData.count || 0,
        watchlistCount: watchlistData.count || 0,
        activeDeals: dealsData.count || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };


  const handleAnalysisComplete = (analysis: any) => {
    setCurrentAnalysis(analysis);
    setShowForm(false);
    setEditingAnalysis(null);
    setRefreshTrigger((prev) => prev + 1);
    toast.success(editingAnalysis ? "Analysis updated successfully!" : "Property analysis completed!");
  };

  const handleEditAnalysis = (analysis: any) => {
    setEditingAnalysis(analysis);
    setCurrentAnalysis(null);
    setShowForm(true);
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
      <div className="space-y-8">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.email?.split("@")[0] || "Investor"}!</h1>
          <p className="text-muted-foreground">
            AI-driven insights for smarter property investing
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAnalyses}</div>
              <p className="text-xs text-muted-foreground">
                Properties analyzed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Watchlist</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.watchlistCount}</div>
              <p className="text-xs text-muted-foreground">
                Properties tracked
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Deals</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeDeals}</div>
              <p className="text-xs text-muted-foreground">
                Available opportunities
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setShowForm(true)}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PlusCircle className="h-5 w-5 mr-2" />
                Analyze Property
              </CardTitle>
              <CardDescription>
                Get instant ROI, yield, and cash-flow analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                Start New Analysis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Link to="/deals">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Browse Deal Feed
                </CardTitle>
                <CardDescription>
                  Explore AI-analyzed investment opportunities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  View {stats.activeDeals} Deals
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Global Yield Explorer */}
        {isEnabled('realityMode') && (
          <GlobalYieldExplorer />
        )}

        {/* Smart Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Analysis Form/Results */}
            {showForm && (
              <Card>
                <CardHeader>
                  <CardTitle>Property Analysis</CardTitle>
                  <CardDescription>
                    Enter property details to get AI-powered investment insights
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PropertyAnalysisForm
                    onComplete={handleAnalysisComplete}
                    onCancel={() => {
                      setShowForm(false);
                      setEditingAnalysis(null);
                    }}
                    existingAnalysis={editingAnalysis}
                  />
                </CardContent>
              </Card>
            )}

            {currentAnalysis && !showForm && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Analysis Results</h2>
                  <Button onClick={() => {
                    setCurrentAnalysis(null);
                    setEditingAnalysis(null);
                    setShowForm(true);
                  }}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Analysis
                  </Button>
                </div>
                <AnalysisResults 
                  analysis={currentAnalysis} 
                  onEdit={() => handleEditAnalysis(currentAnalysis)}
                />
              </div>
            )}

            {/* History Section */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Recent Analyses</h2>
              <AnalysisHistory
                key={refreshTrigger}
                onSelectAnalysis={(analysis) => {
                  setCurrentAnalysis(analysis);
                  setShowForm(false);
                }}
              />
            </div>
          </div>

          {/* Sidebar with Smart Recommendations */}
          <div className="lg:col-span-1">
            <SmartRecommendations />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;