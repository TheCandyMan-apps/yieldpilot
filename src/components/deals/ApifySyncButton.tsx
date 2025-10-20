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

interface ApifySyncButtonProps {
  onSyncComplete?: () => void;
}

export const ApifySyncButton = ({ onSyncComplete }: ApifySyncButtonProps) => {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [location, setLocation] = useState("London");
  const [maxResults, setMaxResults] = useState(50);

  const handleSync = async () => {
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
        description: `Fetching latest Zoopla properties from ${location}`,
      });

      const { data, error } = await supabase.functions.invoke('sync-apify-zoopla', {
        body: {
          actorId: 'dhrumil/zoopla-scraper',
          input: {
            searchType: 'for-sale',
            maxResults: maxResults,
            location: location,
          }
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Sync complete!",
          description: `Successfully imported ${data.inserted} properties from Zoopla`,
        });
        setIsOpen(false);
        onSyncComplete?.();
      } else {
        toast({
          title: "Sync incomplete",
          description: data?.message || "The sync did not complete successfully. Your Apify account may have reached its memory limit.",
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
          Sync Zoopla
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sync Zoopla Properties</DialogTitle>
          <DialogDescription>
            Fetch property listings from Zoopla via Apify
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="location">Location / Postcode</Label>
            <Input
              id="location"
              placeholder="e.g. London, Manchester, M1"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxResults">Max Properties</Label>
            <Input
              id="maxResults"
              type="number"
              min="10"
              max="100"
              value={maxResults}
              onChange={(e) => setMaxResults(parseInt(e.target.value))}
            />
          </div>

          <Button onClick={handleSync} disabled={isSyncing} className="w-full">
            {isSyncing ? (
              <>
                <Download className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
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
