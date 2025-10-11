import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import PropertyAnalysisForm from "@/components/PropertyAnalysisForm";
import AnalysisResults from "@/components/AnalysisResults";
import AnalysisHistory from "@/components/AnalysisHistory";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingAnalysis, setEditingAnalysis] = useState<any>(null);

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">YieldPilot</h1>
            <p className="text-sm text-muted-foreground">
              Welcome back, {user?.email}
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Action Section */}
        <div className="mb-8">
          {!showForm && !currentAnalysis && (
            <div className="text-center py-12">
              <h2 className="text-3xl font-bold mb-4">
                Start Your Property Analysis
              </h2>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Enter property details to get instant ROI, yield, and cash-flow
                calculations powered by AI
              </p>
              <Button size="lg" onClick={() => setShowForm(true)}>
                <PlusCircle className="mr-2 h-5 w-5" />
                New Analysis
              </Button>
            </div>
          )}

          {showForm && (
            <PropertyAnalysisForm
              onComplete={handleAnalysisComplete}
              onCancel={() => {
                setShowForm(false);
                setEditingAnalysis(null);
              }}
              existingAnalysis={editingAnalysis}
            />
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
        </div>

        {/* History Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Previous Analyses</h2>
          <AnalysisHistory
            key={refreshTrigger}
            onSelectAnalysis={(analysis) => {
              setCurrentAnalysis(analysis);
              setShowForm(false);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;