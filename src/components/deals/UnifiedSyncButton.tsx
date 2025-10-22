import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface UnifiedSyncButtonProps {
  onSyncComplete?: () => void;
}

export const UnifiedSyncButton = ({ onSyncComplete }: UnifiedSyncButtonProps) => {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [location, setLocation] = useState("");
  const [maxResults, setMaxResults] = useState(20);

  const handleSync = async () => {
    if (!location.trim()) {
      toast({
        title: "Location required",
        description: "Please enter a location or postcode",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);

    try {
      // Check authentication first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to sync data",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Starting sync...",
        description: `Starting Rightmove and Zoopla in ${location}. Results will appear shortly.`,
      });

      // Kick off both sources in parallel (functions now process in background)
      const [rightmoveResult, zooplaResult] = await Promise.allSettled([
        supabase.functions.invoke('sync-apify-rightmove', {
          body: {
            actorId: 'yyyyuaYekB0HQkfoy',
            input: {
              location,
              maxItems: maxResults,
              propertyType: 'for-sale',
              includeSSTC: false,
              includeUnderOffer: false,
              timeoutSec: 900,
              memoryMB: 2048,
            }
          }
        }),
        supabase.functions.invoke('sync-apify-zoopla', {
          body: {
            actorId: 'dhrumil/zoopla-scraper',
            input: {
              searchType: 'for-sale',
              maxResults: maxResults,
              location,
              timeoutSec: 900,
              memoryMB: 2048,
            }
          }
        })
      ]);

      let rightmoveStarted = false;
      let zooplaStarted = false;
      const errors: string[] = [];

      // Process Rightmove start
      if (rightmoveResult.status === 'fulfilled' && !rightmoveResult.value.error) {
        const data = rightmoveResult.value.data;
        rightmoveStarted = !!data?.started;
        if (!rightmoveStarted) errors.push("Rightmove failed to start");
      } else {
        errors.push("Rightmove failed to start");
      }

      // Process Zoopla start
      if (zooplaResult.status === 'fulfilled' && !zooplaResult.value.error) {
        const data = zooplaResult.value.data;
        zooplaStarted = !!data?.started;
        if (!zooplaStarted) errors.push("Zoopla failed to start");
      } else {
        errors.push("Zoopla failed to start");
      }

      if (rightmoveStarted || zooplaStarted) {
        toast({
          title: "Sync Started",
          description: `Scraping ${location} for properties. New deals will appear automatically in 1-2 minutes.`,
        });
        setIsOpen(false);
        onSyncComplete?.();
      } else {
        toast({
          title: "Sync couldn\'t start",
          description: errors.join(". ") || "Please try again or reduce the max properties.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Failed to sync data",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Sync Data
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sync Property Data</DialogTitle>
          <DialogDescription>
            Fetch property listings from Rightmove and Zoopla
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="location">Location / Postcode *</Label>
            <Input
              id="location"
              placeholder="e.g. London, Manchester, SW1A 1AA"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxResults">Max Properties per Source</Label>
            <Input
              id="maxResults"
              type="number"
              min="10"
              max="100"
              value={maxResults}
              onChange={(e) => setMaxResults(parseInt(e.target.value))}
            />
          </div>

          <Button 
            onClick={handleSync} 
            disabled={isSyncing || !location.trim()} 
            className="w-full"
          >
            {isSyncing ? (
              <>
                <Download className="h-4 w-4 mr-2 animate-spin" />
                Syncing from both sources...
              </>
            ) : (
              <>Fetch Properties</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};