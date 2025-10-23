import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
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

      // Kick off both sources in parallel
      const [rightmoveResult, zooplaResult] = await Promise.allSettled([
        supabase.functions.invoke('sync-apify-rightmove', {
          body: { location, maxResults }
        }),
        supabase.functions.invoke('sync-apify-zoopla', {
          body: { location, maxResults }
        })
      ]);

      const rightmoveResponse = rightmoveResult.status === 'fulfilled' ? rightmoveResult.value.data : null;
      const zooplaResponse = zooplaResult.status === 'fulfilled' ? zooplaResult.value.data : null;

      if (!rightmoveResponse?.runId && !zooplaResponse?.runId) {
        toast({
          title: "Sync Failed",
          description: "Failed to start sync jobs. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sync Started",
        description: "Fetching properties from Rightmove and Zoopla. This will take a moment...",
      });

      // Build query params with run URLs
      const params = new URLSearchParams({ location });
      if (rightmoveResponse?.runUrl) params.append('rightmoveRun', rightmoveResponse.runUrl);
      if (zooplaResponse?.runUrl) params.append('zooplaRun', zooplaResponse.runUrl);

      setIsOpen(false);
      navigate(`/sync-progress?${params.toString()}`);
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