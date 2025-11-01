import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MapPin, Bed, Bath, Home, TrendingUp, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ScoreBadge } from "./ScoreBadge";
import { SmartComps } from "./SmartComps";
import { AreaRadar } from "./AreaRadar";
import { MultiCurrencyPrice } from "./MultiCurrencyPrice";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

interface Listing {
  id: string;
  address_line1: string;
  address_town: string | null;
  postcode: string | null;
  price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  property_type: string | null;
  images: any[];
  source_refs: any[];
  listing_metrics: Array<{
    score: number | null;
    drivers: string[];
    risks: string[];
    kpis: any;
    enrichment: any;
  }>;
}

interface DealCardV2Props {
  listing: Listing;
  isWatchlisted?: boolean;
  onWatchlistToggle?: (listingId: string) => void;
  allListings?: any[];
  heroLayer?: boolean;
}

export const DealCardV2 = ({ 
  listing, 
  isWatchlisted = false,
  onWatchlistToggle,
  allListings = [],
  heroLayer = false
}: DealCardV2Props) => {
  const navigate = useNavigate();
  const [trackingView, setTrackingView] = useState(false);
  const [compsOpen, setCompsOpen] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleViewDeal = async () => {
    if (!trackingView) {
      setTrackingView(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.from("deal_interactions").insert({
            user_id: session.user.id,
            deal_id: listing.id,
            interaction_type: "viewed"
          });
        }
      } catch (error) {
        console.error("Error tracking view:", error);
      }
    }
  };

  const metrics = listing.listing_metrics?.[0];
  const kpis = metrics?.kpis;
  const enrichment = metrics?.enrichment;
  const score = metrics?.score || 0;
  const drivers = metrics?.drivers || [];
  const risks = metrics?.risks || [];

  const imageUrl = listing.images?.[0]?.src;
  const listingUrl = listing.source_refs?.[0]?.url;

  const rentEstimate = enrichment?.area?.rentRef;
  const yieldPct = kpis?.gross_yield_pct;

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 group">
      {/* Image */}
      <div className="relative h-48 bg-muted overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={listing.address_line1}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <Home className="h-16 w-16 text-primary/30" />
          </div>
        )}
        
        {/* Watchlist Button */}
        {onWatchlistToggle && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 bg-card/90 hover:bg-card shadow-md"
            onClick={() => onWatchlistToggle(listing.id)}
          >
            <Heart
              className={`h-5 w-5 ${isWatchlisted ? "fill-red-500 text-red-500" : "text-gray-600"}`}
            />
          </Button>
        )}

        {/* Score Badge */}
        {score > 0 && (
          <div className="absolute top-2 left-2">
            <ScoreBadge 
              score={score} 
              drivers={drivers} 
              risks={risks}
              size="sm"
            />
          </div>
        )}

        {/* Provenance Chips */}
        <div className="absolute bottom-2 left-2 flex gap-1">
          <Badge variant="secondary" className="text-xs">Zoopla</Badge>
          {enrichment?.epc?.provenance === "mock" && (
            <Badge variant="outline" className="text-xs bg-card/90">EPC (Est.)</Badge>
          )}
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Location */}
        <div className="space-y-1">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm line-clamp-1">{listing.address_line1}</h3>
              <p className="text-xs text-muted-foreground">
                {listing.address_town}{listing.postcode ? `, ${listing.postcode}` : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Price & Rent */}
        <div className="flex items-center justify-between">
          <div>
            <MultiCurrencyPrice 
              amount={listing.price}
              sourceCurrency="GBP"
              className="text-lg font-bold"
            />
            {rentEstimate && (
              <p className="text-xs text-muted-foreground">
                £{rentEstimate.toLocaleString()}/mo rent
              </p>
            )}
          </div>
          <div className="text-right">
            {yieldPct && (
              <p className="text-lg font-bold text-primary">
                {yieldPct.toFixed(1)}%
              </p>
            )}
            <p className="text-xs text-muted-foreground">Yield</p>
          </div>
        </div>

        {/* Property Details */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {listing.bedrooms && (
            <span className="flex items-center gap-1">
              <Bed className="h-4 w-4" />
              {listing.bedrooms}
            </span>
          )}
          {listing.bathrooms && (
            <span className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              {listing.bathrooms}
            </span>
          )}
          {listing.property_type && (
            <Badge variant="outline" className="text-xs">
              {listing.property_type}
            </Badge>
          )}
        </div>

        {/* Cashflow */}
        {kpis?.cashflow_monthly && (
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs text-muted-foreground">Monthly Cashflow</span>
            <Badge 
              variant={kpis.cashflow_monthly >= 0 ? "default" : "destructive"}
              className="font-mono"
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              £{Math.round(kpis.cashflow_monthly)}/mo
            </Badge>
          </div>
        )}

        {/* Hero Layer Features */}
        {heroLayer && (
          <div className="space-y-3 pt-3 border-t">
            {/* Area Radar */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Area Intel
              </p>
              <AreaRadar enrichment={enrichment} />
            </div>

            {/* Smart Comps - Collapsible */}
            {allListings.length > 1 && (
              <Collapsible open={compsOpen} onOpenChange={setCompsOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                  >
                    Smart Comps
                    <ChevronDown className={`h-4 w-4 transition-transform ${compsOpen ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <SmartComps
                    listing={{
                      id: listing.id,
                      price: listing.price,
                      bedrooms: listing.bedrooms,
                      postcode: listing.postcode
                    }}
                    allListings={allListings}
                  />
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            className="flex-1" 
            size="sm"
            onClick={() => {
              handleViewDeal();
              navigate(`/deal/${listing.id}`);
            }}
          >
            View Analysis
          </Button>
          {listingUrl && (
            <Button 
              variant="default" 
              size="sm"
              onClick={() => window.open(listingUrl, "_blank")}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
