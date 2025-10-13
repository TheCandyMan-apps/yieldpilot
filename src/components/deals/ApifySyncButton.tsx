import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Download } from "lucide-react";

interface ApifySyncButtonProps {
  onSyncComplete?: () => void;
}

export const ApifySyncButton = ({ onSyncComplete }: ApifySyncButtonProps) => {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);

    try {
      toast({
        title: "Starting sync...",
        description: "Fetching latest Zoopla properties from Apify",
      });

      const { data, error } = await supabase.functions.invoke('sync-apify-zoopla', {
        body: {
          actorId: 'dhrumil/zoopla-scraper',
          input: {
            searchType: 'for-sale',
            maxResults: 50,
            location: 'London',
          }
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Sync complete!",
          description: `Successfully imported ${data.inserted} properties from Zoopla`,
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
      console.error('Error syncing Apify data:', error);
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
    <Button
      onClick={handleSync}
      disabled={isSyncing}
      variant="outline"
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      {isSyncing ? "Syncing Zoopla..." : "Sync Zoopla Data"}
    </Button>
  );
};
