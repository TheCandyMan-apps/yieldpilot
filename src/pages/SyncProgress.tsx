import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

const SyncProgress = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = searchParams.get('location');
  const rightmoveRun = searchParams.get('rightmoveRun');
  const zooplaRun = searchParams.get('zooplaRun');
  
  const [dealCount, setDealCount] = useState(0);
  const [baseline, setBaseline] = useState(0);
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
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              {error ? (
                <AlertCircle className="h-8 w-8 text-destructive" />
              ) : isComplete ? (
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              ) : (
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              )}
              <div className="flex-1">
                <CardTitle>
                  {error ? "Sync Error" : isComplete ? "Sync Complete" : "Syncing Properties"}
                </CardTitle>
                <CardDescription>
                  {error 
                    ? "An error occurred during sync" 
                    : isComplete 
                    ? `Found ${newDeals} new ${newDeals === 1 ? 'property' : 'properties'}` 
                    : location 
                    ? `Fetching properties for ${location} from Rightmove and Zoopla`
                    : "Fetching property data from Rightmove and Zoopla"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
                {error}
              </div>
            )}
            
            {(rightmoveRun || zooplaRun) && (
              <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium">Apify Runs:</p>
                <div className="space-y-1">
                  {rightmoveRun && (
                    <a 
                      href={rightmoveRun} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      View Rightmove run <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {zooplaRun && (
                    <a 
                      href={zooplaRun} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      View Zoopla run <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            )}
            
            {!isComplete && !error && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Scraping Rightmove...</span>
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Scraping Zoopla...</span>
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>New properties found:</span>
                  <span>{newDeals}</span>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button onClick={handleViewDeals} className="w-full">
                View Deals
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SyncProgress;
