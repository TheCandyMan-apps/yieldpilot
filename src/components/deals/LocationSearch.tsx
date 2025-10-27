import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { analytics } from "@/lib/analytics";

interface LocationSearchProps {
  defaultLocation?: string;
  onSearchStart?: () => void;
  onSearchComplete?: () => void;
}

export const LocationSearch = ({ 
  defaultLocation = '', 
  onSearchStart,
  onSearchComplete 
}: LocationSearchProps) => {
  const [location, setLocation] = useState(defaultLocation);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!location.trim()) {
      toast({
        title: "Enter a location",
        description: "Please enter a city, town, or postcode to search for properties.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    onSearchStart?.();
    const startTime = Date.now();

    try {
      // Check authentication
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Sign in required",
          description: "Please sign in to sync property listings.",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }
      const userId = user.id;

      analytics.ingestStart('rightmove', 50);
      analytics.ingestStart('zoopla', 50);

      // Call both sync functions
      const [rightmoveResult, zooplaResult] = await Promise.allSettled([
        supabase.functions.invoke('sync-apify-rightmove', {
          body: { location: location.trim(), maxResults: 50, userId }
        }),
        supabase.functions.invoke('sync-apify-zoopla', {
          body: { location: location.trim(), maxResults: 50, userId }
        })
      ]);

      console.log('Rightmove result:', rightmoveResult);
      console.log('Zoopla result:', zooplaResult);

      const rightmoveSuccess = rightmoveResult.status === 'fulfilled' && 
        !rightmoveResult.value.error && rightmoveResult.value.data?.runId;
      const zooplaSuccess = zooplaResult.status === 'fulfilled' && 
        !zooplaResult.value.error && zooplaResult.value.data?.runId;

      if (rightmoveSuccess || zooplaSuccess) {
        const duration = Date.now() - startTime;
        const sources = [];
        if (rightmoveSuccess) {
          sources.push('Rightmove');
          analytics.ingestSuccess('rightmove', 50, duration);
        }
        if (zooplaSuccess) {
          sources.push('Zoopla');
          analytics.ingestSuccess('zoopla', 50, duration);
        }
        
        toast({
          title: "Search Started",
          description: `Searching ${sources.join(' and ')} for properties in ${location}. This will take a moment...`,
        });
        
        if (onSearchComplete) {
          onSearchComplete();
        }
        
        // Navigate to sync progress page
        const rightmoveRunId = rightmoveSuccess && rightmoveResult.status === 'fulfilled' 
          ? rightmoveResult.value.data?.runId : null;
        const zooplaRunId = zooplaSuccess && zooplaResult.status === 'fulfilled' 
          ? zooplaResult.value.data?.runId : null;

        const params = new URLSearchParams({ location: location.trim() });
        if (rightmoveRunId) params.set('rightmoveRun', `https://console.apify.com/view/runs/${rightmoveRunId}`);
        if (zooplaRunId) params.set('zooplaRun', `https://console.apify.com/view/runs/${zooplaRunId}`);
        
        navigate(`/sync-progress?${params.toString()}`);
      } else {
        const errors = [];
        if (rightmoveResult.status === 'rejected' || rightmoveResult.value.error) {
          const msg = rightmoveResult.status === 'rejected' 
            ? rightmoveResult.reason?.message 
            : rightmoveResult.value.error?.message;
          errors.push(`Rightmove: ${msg || 'Unknown error'}`);
          analytics.ingestFail('rightmove', msg || 'unknown');
        }
        if (zooplaResult.status === 'rejected' || zooplaResult.value.error) {
          const msg = zooplaResult.status === 'rejected' 
            ? zooplaResult.reason?.message 
            : zooplaResult.value.error?.message;
          errors.push(`Zoopla: ${msg || 'Unknown error'}`);
          analytics.ingestFail('zoopla', msg || 'unknown');
        }
        throw new Error(errors.join('; ') || 'Both search attempts failed');
      }
      
    } catch (error: any) {
      console.error("Search error:", error);
      toast({
        title: "Search failed",
        description: error.message || "Failed to start property search. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSearching && location.trim()) {
      handleSearch();
    }
  };

  const isButtonDisabled = isSearching;

  return (
    <div className="flex gap-2 w-full max-w-2xl">
      <div className="relative flex-1">
        <Input
          type="text"
          placeholder="Enter city, town, or postcode (e.g. Surrey, GU1, Manchester)"
          value={location}
          onChange={(e) => {
            const v = e.target.value;
            console.debug('LocationSearch input value:', v);
            setLocation(v);
          }}
          onKeyDown={handleKeyDown}
          disabled={isSearching}
          className="pr-10"
        />
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>
      <Button 
        type="button"
        onClick={handleSearch} 
        disabled={isButtonDisabled}
        size="default"
      >
        {isSearching ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Searching...
          </>
        ) : (
          'Search Properties'
        )}
      </Button>
    </div>
  );
};
