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
      const [rightmoveRes, zooplaRes] = await Promise.all([
        supabase.functions.invoke("sync-apify-rightmove", {
          body: {
            actorId: "yyyyuaYekB0HQkfoy",
            input: {
              location: location.trim(),
              maxItems: 20,
              propertyType: "for-sale",
              includeSSTC: false,
              includeUnderOffer: false,
              timeoutSec: 900,
              memoryMB: 2048,
            },
          },
        }),
        supabase.functions.invoke("sync-apify-zoopla", {
          body: {
            actorId: "dhrumil/zoopla-scraper",
            input: {
              searchType: "for-sale",
              maxResults: 20,
              location: location.trim(),
              timeoutSec: 900,
              memoryMB: 2048,
            },
          },
        }),
      ]);

      if (rightmoveRes.error || zooplaRes.error) {
        throw new Error(rightmoveRes.error?.message || zooplaRes.error?.message);
      }

      toast({
        title: "Search started!",
        description: `Searching for properties in ${location}. Results will appear automatically when ready.`,
      });

      // Navigate to deals page with location param (realtime will update automatically)
      navigate(`/deals?location=${encodeURIComponent(location.trim())}`);
      
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

  const isButtonDisabled = isSearching || location.trim().length === 0;

  return (
    <div className="flex gap-2 w-full max-w-2xl">
      <div className="relative flex-1">
        <Input
          type="text"
          placeholder="Enter city, town, or postcode (e.g. Surrey, GU1, Manchester)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSearching}
          className="pr-10"
        />
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>
      <Button 
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
