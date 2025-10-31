import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface ProvenanceDrawerProps {
  deal: {
    id: string;
    source?: string;
    created_at?: string;
    updated_at?: string;
    listing_url?: string;
  };
}

export function ProvenanceDrawer({ deal }: ProvenanceDrawerProps) {
  const formatDate = (date?: string) => {
    if (!date) return "Unknown";
    return format(new Date(date), "PPP 'at' p");
  };

  const getSourceDisplay = (source?: string) => {
    const sourceMap: Record<string, { name: string; badge: string }> = {
      'rightmove': { name: 'Rightmove UK', badge: '🇬🇧' },
      'zoopla': { name: 'Zoopla UK', badge: '🇬🇧' },
      'zillow': { name: 'Zillow US', badge: '🇺🇸' },
      'realtor': { name: 'Realtor.com US', badge: '🇺🇸' },
      'redfin': { name: 'Redfin US', badge: '🇺🇸' },
      'idealista': { name: 'Idealista ES', badge: '🇪🇸' },
      'seloger': { name: 'SeLoger FR', badge: '🇫🇷' },
      'immobilien': { name: 'Immobilien DE', badge: '🇩🇪' },
      'manual': { name: 'Manual Entry', badge: '✍️' },
    };

    return sourceMap[source || 'manual'] || { name: source || 'Unknown', badge: '?' };
  };

  const sourceInfo = getSourceDisplay(deal.source);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm">
          <Info className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Deal Provenance</SheetTitle>
          <SheetDescription>
            Source and timeline information for this property
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          <div>
            <h3 className="text-sm font-medium mb-2">Data Source</h3>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-lg">
                {sourceInfo.badge}
              </Badge>
              <span className="font-medium">{sourceInfo.name}</span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">First Seen</h3>
            <p className="text-sm text-muted-foreground">
              {formatDate(deal.created_at)}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Last Updated</h3>
            <p className="text-sm text-muted-foreground">
              {formatDate(deal.updated_at)}
            </p>
          </div>

          {deal.listing_url && (
            <div>
              <h3 className="text-sm font-medium mb-2">Original Listing</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(deal.listing_url, '_blank')}
                className="w-full"
              >
                View on {sourceInfo.name}
              </Button>
            </div>
          )}

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-2">Data Quality</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completeness</span>
                <span className="font-medium">
                  {deal.listing_url ? '95%' : '80%'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Freshness</span>
                <Badge variant="outline" className="text-xs">
                  Recent
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}