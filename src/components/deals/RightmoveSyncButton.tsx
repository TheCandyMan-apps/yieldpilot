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

interface RightmoveSyncButtonProps {
  onSyncComplete?: () => void;
}

export const RightmoveSyncButton = ({ onSyncComplete }: RightmoveSyncButtonProps) => {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [location, setLocation] = useState("London");
  const [maxItems, setMaxItems] = useState(50);

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
        description: `Fetching latest Rightmove properties from ${location}`,
      });

      const { data, error } = await supabase.functions.invoke('sync-apify-rightmove', {
        body: {
          actorId: 'curious_coder/rightmove-scraper',
          input: {
            location: location,
            maxItems: maxItems,
            propertyType: 'for-sale',
            includeSSTC: false,
            includeUnderOffer: false,
          }
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Sync complete!",
          description: `Successfully imported ${data.inserted} properties from Rightmove`,
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
        description: error instanceof Error ? error.message : "Failed to sync data from Rightmove",
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
          Sync Rightmove
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sync Rightmove Properties</DialogTitle>
          <DialogDescription>
            Fetch property listings from Rightmove via Apify
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="location">Location / Postcode</Label>
            <Input
              id="location"
              placeholder="e.g. London, Manchester, SW1A 1AA"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxItems">Max Properties</Label>
            <Input
              id="maxItems"
              type="number"
              min="10"
              max="100"
              value={maxItems}
              onChange={(e) => setMaxItems(parseInt(e.target.value))}
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