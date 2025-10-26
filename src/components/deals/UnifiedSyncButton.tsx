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

      // Build URLs for both sites from location
      const isPostcode = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d?[A-Z]{0,2}$/i.test(location.trim());
      const zooplaUrl = isPostcode 
        ? `https://www.zoopla.co.uk/for-sale/property/${encodeURIComponent(location)}/?search_source=for-sale`
        : `https://www.zoopla.co.uk/for-sale/property/?q=${encodeURIComponent(location)}&search_source=for-sale`;
      const rightmoveUrl = `https://www.rightmove.co.uk/property-for-sale/find.html?searchLocation=${encodeURIComponent(location)}`;

      toast({
        title: "Starting sync...",
        description: `Fetching properties in ${location} from both sources...`,
      });

      // Call unified ingestion function for both sites
      const [rightmoveResult, zooplaResult] = await Promise.allSettled([
        supabase.functions.invoke('ingest-property-url', {
          body: { url: rightmoveUrl, maxResults }
        }),
        supabase.functions.invoke('ingest-property-url', {
          body: { url: zooplaUrl, maxResults }
        })
      ]);

      const rightmoveSuccess = rightmoveResult.status === 'fulfilled' && 
        rightmoveResult.value.data?.ok === true;
      const zooplaSuccess = zooplaResult.status === 'fulfilled' && 
        zooplaResult.value.data?.ok === true;

      if (rightmoveSuccess || zooplaSuccess) {
        const sources = [];
        if (rightmoveSuccess) sources.push('Rightmove');
        if (zooplaSuccess) sources.push('Zoopla');
        
        toast({
          title: "Sync Started",
          description: `Fetching properties from ${sources.join(' and ')}. This will take a moment...`,
        });

        setIsOpen(false);
        onSyncComplete?.();

        // Navigate to sync progress page
        const rightmoveRunId = rightmoveSuccess && rightmoveResult.status === 'fulfilled' 
          ? rightmoveResult.value.data?.runId : null;
        const zooplaRunId = zooplaSuccess && zooplaResult.status === 'fulfilled' 
          ? zooplaResult.value.data?.runId : null;

        const params = new URLSearchParams({ location });
        if (rightmoveRunId) params.set('rightmove', rightmoveRunId);
        if (zooplaRunId) params.set('zoopla', zooplaRunId);
        
        navigate(`/sync-progress?${params.toString()}`);
      } else {
        // Extract error details for better diagnostics
        const errors = [];
        if (rightmoveResult.status === 'fulfilled' && rightmoveResult.value.data?.ok === false) {
          errors.push(`Rightmove: ${rightmoveResult.value.data.details?.message || 'Unknown error'}`);
        }
        if (zooplaResult.status === 'fulfilled' && zooplaResult.value.data?.ok === false) {
          errors.push(`Zoopla: ${zooplaResult.value.data.details?.message || 'Unknown error'}`);
        }
        throw new Error(errors.join('; ') || 'Both sync attempts failed');
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