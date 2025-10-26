import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, RefreshCw } from "lucide-react";

export function PWAUpdatePrompt() {
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    // Listen for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setShowUpdate(true);
      });
    }
  }, []);

  const handleUpdate = () => {
    window.location.reload();
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-slide-up">
      <Card className="p-4 shadow-lg border-primary/20">
        <div className="flex items-start gap-3">
          <RefreshCw className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">Update Available</h3>
            <p className="text-xs text-muted-foreground mb-3">
              A new version of YieldPilot is ready. Refresh to get the latest features.
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleUpdate}>
                Update Now
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowUpdate(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
