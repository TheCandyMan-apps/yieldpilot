import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Download } from "lucide-react";

interface RightmoveSyncButtonProps {
  onSyncComplete?: () => void;
}

export const RightmoveSyncButton = ({ onSyncComplete }: RightmoveSyncButtonProps) => {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);

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
        description: "Fetching latest Rightmove properties from Apify",
      });

      const { data, error } = await supabase.functions.invoke('sync-apify-rightmove', {
        body: {
          actorId: 'curious_coder/rightmove-scraper',
          input: {
            locationIdentifier: 'REGION^876', // London
            maxItems: 50,
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
        onSyncComplete?.();
      } else {
        toast({
          title: "Sync incomplete",
          description: data?.message || "The sync did not complete successfully",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error syncing Rightmove data:', error);
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
    <Button
      onClick={handleSync}
      disabled={isSyncing}
      variant="outline"
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      {isSyncing ? "Syncing Rightmove..." : "Sync Rightmove Data"}
    </Button>
  );
};