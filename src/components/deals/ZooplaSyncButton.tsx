import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ZooplaSyncButtonProps {
  onSyncComplete?: () => void;
}

export const ZooplaSyncButton = ({ onSyncComplete }: ZooplaSyncButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [area, setArea] = useState("London");
  const [radius, setRadius] = useState(5);
  const [maxPrice, setMaxPrice] = useState(500000);
  const { toast } = useToast();

  const handleSync = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-zoopla-listings", {
        body: { area, radius, maxPrice },
      });

      if (error) throw error;

      toast({
        title: "✅ Zoopla sync complete",
        description: data.message || `Synced ${data.total || 0} listings`,
      });

      setIsOpen(false);
      if (onSyncComplete) onSyncComplete();
    } catch (error: any) {
      toast({
        title: "Sync error",
        description: error.message || "Failed to sync Zoopla listings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Sync Zoopla
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sync Zoopla Listings</DialogTitle>
          <DialogDescription>
            Fetch latest property listings from Zoopla API
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="area">Area / Postcode</Label>
            <Input
              id="area"
              placeholder="e.g. London, M1, SW1A"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="radius">Radius (miles)</Label>
            <Input
              id="radius"
              type="number"
              min="1"
              max="40"
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxPrice">Max Price (£)</Label>
            <Input
              id="maxPrice"
              type="number"
              min="0"
              step="10000"
              value={maxPrice}
              onChange={(e) => setMaxPrice(parseInt(e.target.value))}
            />
          </div>

          <Button onClick={handleSync} disabled={loading} className="w-full">
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>Fetch Listings</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
