import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

      // Trigger both Rightmove and Zoopla syncs in parallel
      const [rightmoveResult, zooplaResult] = await Promise.allSettled([
        supabase.functions.invoke('sync-apify-rightmove', {
          body: { location: location.trim(), maxResults: 50 }
        }),
        supabase.functions.invoke('sync-apify-zoopla', {
          body: { location: location.trim(), maxResults: 50 }
        })
      ]);

      console.log('Rightmove result:', rightmoveResult);
      console.log('Zoopla result:', zooplaResult);

      const rightmoveData = rightmoveResult.status === 'fulfilled' ? rightmoveResult.value.data : null;
      const zooplaData = zooplaResult.status === 'fulfilled' ? zooplaResult.value.data : null;

      let successCount = 0;
      if (rightmoveResult.status === 'fulfilled' && !rightmoveResult.value.error) successCount++;
      if (zooplaResult.status === 'fulfilled' && !zooplaResult.value.error) successCount++;

      if (successCount > 0) {
        toast({
          title: "Search Started",
          description: `Searching ${successCount} source${successCount > 1 ? 's' : ''} for properties in ${location}. This will take a moment...`,
        });
        
        if (onSearchComplete) {
          onSearchComplete();
        }
        
        // Build query params for sync progress page
        const params = new URLSearchParams({ location: location.trim() });
        if (rightmoveData?.runUrl) params.append('rightmoveRun', rightmoveData.runUrl);
        if (zooplaData?.runUrl) params.append('zooplaRun', zooplaData.runUrl);
        
        // Navigate to sync progress page with run info
        navigate(`/sync-progress?${params.toString()}`);
      } else {
        toast({
          title: "Search failed",
          description: "Failed to start property search. Please try again.",
          variant: "destructive",
        });
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
      onSearchComplete?.();
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
