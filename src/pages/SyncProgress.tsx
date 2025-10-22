import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SyncProgress() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = searchParams.get("location") || "Unknown";
  const [dealCount, setDealCount] = useState(0);
  const [baseline, setBaseline] = useState<number | null>(null);
  const [newDeals, setNewDeals] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Initialize baseline count first
    const init = async () => {
      try {
        const { count, error } = await supabase
          .from('deals_feed')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);
        if (error) throw error;
        if (mounted) {
          const base = count || 0;
          setBaseline(base);
          setDealCount(base);
          setNewDeals(0);
        }
      } catch (err) {
        console.error('Error initializing baseline:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize');
      }
    };

    init();

    // Realtime: complete as soon as a new deal is inserted
    const channel = supabase
      .channel('deals-feed-sync')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'deals_feed' },
        () => {
          setNewDeals((n) => n + 1);
          setIsComplete(true);
        }
      )
      .subscribe();

    // Poll every 3s for new deals beyond baseline
    const pollInterval = setInterval(async () => {
      if (baseline === null) return;
      try {
        const { count, error } = await supabase
          .from('deals_feed')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);
        if (error) throw error;
        if ((count || 0) > baseline) {
          setDealCount(count || 0);
          setNewDeals((count || 0) - baseline);
          setTimeout(() => setIsComplete(true), 1500);
        }
      } catch (err) {
        console.error('Error polling deals:', err);
        setError(err instanceof Error ? err.message : 'Failed to check for new deals');
      }
    }, 3000);

    // Auto-complete after 90 seconds regardless
    const timeout = setTimeout(() => setIsComplete(true), 90000);

    return () => {
      mounted = false;
      clearInterval(pollInterval);
      clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
  }, [baseline]);

  const handleViewDeals = () => {
    navigate(`/deals?location=${encodeURIComponent(location)}`);
  };

  return (
    <DashboardLayout>
      <div className="container max-w-2xl mx-auto py-20">
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              {error ? (
                <AlertCircle className="h-8 w-8 text-destructive" />
              ) : isComplete ? (
                <CheckCircle2 className="h-8 w-8 text-green-500 animate-scale-in" />
              ) : (
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {error ? "Sync Error" : isComplete ? "Sync Complete!" : "Syncing Properties"}
            </CardTitle>
            <CardDescription className="text-base">
              {error ? (
                error
              ) : isComplete ? (
                `Found ${dealCount} properties in ${location}`
              ) : (
                `Fetching properties from Rightmove and Zoopla in ${location}...`
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!error && !isComplete && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 animate-fade-in">
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Scraping Rightmove</p>
                    <p className="text-xs text-muted-foreground">This may take 1-2 minutes</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 animate-fade-in" style={{ animationDelay: '150ms' }}>
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Scraping Zoopla</p>
                    <p className="text-xs text-muted-foreground">This may take 1-2 minutes</p>
                  </div>
                </div>
                <div className="text-center text-sm text-muted-foreground pt-4">
                  <p>Properties will appear automatically when ready.</p>
                  <p className="text-xs mt-1">You can wait here or come back later.</p>
                </div>
              </div>
            )}

            {isComplete && !error && (
              <div className="text-center space-y-4 animate-fade-in">
                <p className="text-muted-foreground">
                  {newDeals > 0
                    ? 'New properties have been added to your deals feed.'
                    : 'No new properties were added. You can view current deals.'}
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              {isComplete || error ? (
                <Button onClick={handleViewDeals} className="w-full" size="lg">
                  View Deals
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={handleViewDeals} className="flex-1">
                    View Current Deals
                  </Button>
                  <Button variant="ghost" onClick={() => navigate(-1)} className="flex-1">
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
