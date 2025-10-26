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

      // Build URLs for both sites from location
      const isPostcode = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d?[A-Z]{0,2}$/i.test(location.trim());
      const zooplaUrl = `https://www.zoopla.co.uk/for-sale/property/${encodeURIComponent(location)}/?search_source=for-sale`;
      const rightmoveUrl = isPostcode
        ? `https://www.rightmove.co.uk/property-for-sale/find.html?searchLocation=${encodeURIComponent(location)}&radius=0.0`
        : `https://www.rightmove.co.uk/property-for-sale/find.html?searchLocation=${encodeURIComponent(location)}`;

      analytics.ingestStart('rightmove', 50);
      analytics.ingestStart('zoopla', 50);

      // Call unified ingestion function for both sites
      const [rightmoveResult, zooplaResult] = await Promise.allSettled([
        supabase.functions.invoke('ingest-property-url', {
          body: { url: rightmoveUrl, maxResults: 50 }
        }),
        supabase.functions.invoke('ingest-property-url', {
          body: { url: zooplaUrl, maxResults: 50 }
        })
      ]);

      console.log('Rightmove result:', rightmoveResult);
      console.log('Zoopla result:', zooplaResult);

      const rightmoveSuccess = rightmoveResult.status === 'fulfilled' && 
        rightmoveResult.value.data?.ok === true;
      const zooplaSuccess = zooplaResult.status === 'fulfilled' && 
        zooplaResult.value.data?.ok === true;

      if (rightmoveSuccess || zooplaSuccess) {
        const duration = Date.now() - startTime;
        const sources = [];
        if (rightmoveSuccess) {
          sources.push('Rightmove');
          const itemCount = rightmoveResult.value.data?.itemCount || 0;
          analytics.ingestSuccess('rightmove', itemCount, duration);
        }
        if (zooplaSuccess) {
          sources.push('Zoopla');
          const itemCount = zooplaResult.value.data?.itemCount || 0;
          analytics.ingestSuccess('zoopla', itemCount, duration);
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
        if (rightmoveRunId) params.set('rightmove', rightmoveRunId);
        if (zooplaRunId) params.set('zoopla', zooplaRunId);
        
        navigate(`/sync-progress?${params.toString()}`);
      } else {
        // Extract error details for better diagnostics
        const errors = [];
        if (rightmoveResult.status === 'fulfilled' && rightmoveResult.value.data?.ok === false) {
          const error = rightmoveResult.value.data.error || 'unknown';
          errors.push(`Rightmove: ${rightmoveResult.value.data.details?.message || 'Unknown error'}`);
          analytics.ingestFail('rightmove', error);
        }
        if (zooplaResult.status === 'fulfilled' && zooplaResult.value.data?.ok === false) {
          const error = zooplaResult.value.data.error || 'unknown';
          errors.push(`Zoopla: ${zooplaResult.value.data.details?.message || 'Unknown error'}`);
          analytics.ingestFail('zoopla', error);
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
