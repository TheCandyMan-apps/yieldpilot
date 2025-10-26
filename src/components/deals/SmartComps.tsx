import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Comp {
  id: string;
  address: string;
  price: number;
  bedrooms: number | null;
  distance: number; // in km
  pricePerSqm?: number;
}

interface SmartCompsProps {
  listing: {
    id: string;
    price: number;
    bedrooms: number | null;
    postcode: string | null;
  };
  allListings: any[];
}

export const SmartComps = ({ listing, allListings }: SmartCompsProps) => {
  const findComps = (): Comp[] => {
    if (!allListings.length) return [];

    // Simple distance heuristic based on postcode prefix
    const getDistance = (pc1: string | null, pc2: string | null) => {
      if (!pc1 || !pc2) return 999;
      const prefix1 = pc1.replace(/[^A-Z0-9]/gi, '').slice(0, 4).toLowerCase();
      const prefix2 = pc2.replace(/[^A-Z0-9]/gi, '').slice(0, 4).toLowerCase();
      if (prefix1 === prefix2) return 0.5;
      if (prefix1.slice(0, 2) === prefix2.slice(0, 2)) return 2;
      return 10;
    };

    const comps = allListings
      .filter(l => l.id !== listing.id)
      .map(l => ({
        id: l.id,
        address: l.address_line1 || l.property_address,
        price: l.price,
        bedrooms: l.bedrooms,
        distance: getDistance(listing.postcode, l.postcode),
        pricePerSqm: l.square_feet ? l.price / l.square_feet : undefined
      }))
      .filter(c => {
        // Match bedrooms if available
        if (listing.bedrooms && c.bedrooms) {
          return Math.abs(c.bedrooms - listing.bedrooms) <= 1;
        }
        // Price range ±30%
        return c.price >= listing.price * 0.7 && c.price <= listing.price * 1.3;
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);

    return comps;
  };

  const comps = findComps();

  if (!comps.length) {
    return (
      <div className="text-xs text-muted-foreground py-2 px-3 bg-muted/30 rounded-md">
        No comparable properties available
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getPriceDiff = (compPrice: number) => {
    const diff = ((compPrice - listing.price) / listing.price) * 100;
    return diff;
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Comps Nearby
      </p>
      <div className="space-y-2">
        {comps.map((comp) => {
          const diff = getPriceDiff(comp.price);
          return (
            <Card key={comp.id} className="border-l-2 border-l-primary/20">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium line-clamp-1">{comp.address}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-semibold">{formatPrice(comp.price)}</span>
                      {comp.bedrooms && (
                        <Badge variant="outline" className="text-xs">
                          {comp.bedrooms} bed
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      ~{comp.distance.toFixed(1)}km away
                      {comp.pricePerSqm && ` • £${Math.round(comp.pricePerSqm)}/sqm`}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {Math.abs(diff) < 2 ? (
                      <Badge variant="outline" className="gap-1">
                        <Minus className="h-3 w-3" />
                        Similar
                      </Badge>
                    ) : diff > 0 ? (
                      <Badge variant="outline" className="gap-1 text-green-600 border-green-600/30">
                        <TrendingUp className="h-3 w-3" />
                        +{diff.toFixed(0)}%
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-red-600 border-red-600/30">
                        <TrendingDown className="h-3 w-3" />
                        {diff.toFixed(0)}%
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
