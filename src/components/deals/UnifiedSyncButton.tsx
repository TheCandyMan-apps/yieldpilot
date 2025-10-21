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
  const [maxResults, setMaxResults] = useState(50);

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to sync data",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Starting sync...",
        description: `Fetching properties from Rightmove and Zoopla in ${location}`,
      });

      // Sync both sources in parallel
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

      let rightmoveCount = 0;
      let zooplaCount = 0;
      const errors: string[] = [];

      // Process Rightmove result
      if (rightmoveResult.status === 'fulfilled' && !rightmoveResult.value.error) {
        const data = rightmoveResult.value.data;
        if (data?.success) {
          rightmoveCount = data.inserted || 0;
        } else {
          errors.push("Rightmove sync incomplete");
        }
      } else {
        errors.push("Rightmove sync failed");
      }

      // Process Zoopla result
      if (zooplaResult.status === 'fulfilled' && !zooplaResult.value.error) {
        const data = zooplaResult.value.data;
        if (data?.success) {
          zooplaCount = data.inserted || 0;
        } else {
          errors.push("Zoopla sync incomplete");
        }
      } else {
        errors.push("Zoopla sync failed");
      }

      const totalImported = rightmoveCount + zooplaCount;

      if (totalImported > 0) {
        toast({
          title: "Sync complete!",
          description: `Imported ${rightmoveCount} from Rightmove and ${zooplaCount} from Zoopla (${totalImported} total)`,
        });
        setIsOpen(false);
        onSyncComplete?.();
      } else {
        toast({
          title: "Sync incomplete",
          description: errors.join(". ") || "No properties were imported. Check your Apify account limits.",
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
            Fetch property listings from Rightmove and Zoopla via Apify
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