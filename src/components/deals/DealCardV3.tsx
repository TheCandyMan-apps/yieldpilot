import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Heart,
  MapPin,
  Bed,
  Bath,
  TrendingUp,
  ExternalLink,
  Info,
} from "lucide-react";
import { formatCurrency } from "@/lib/portfolioCalculations";
import { useNavigate } from "react-router-dom";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";

interface DealCardV3Props {
  listing: {
    id: string;
    country: string;
    region?: string;
    city?: string;
    address_line1: string;
    postcode?: string;
    price: number;
    currency: string;
    bedrooms?: number;
    bathrooms?: number;
    property_type?: string;
    images?: string[];
    listing_url?: string;
    source: string;
    estimated_rent?: number;
    created_at?: string;
    data_provenance?: any;
    metrics?: {
      score: number;
      kpis?: {
        gross_yield_pct?: number;
        net_yield_pct?: number;
        cashflow_monthly?: number;
      };
    };
  };
  isWatchlisted?: boolean;
  pipelineStatus?: string;
  onToggleWatchlist?: () => void;
}

export function DealCardV3({
  listing,
  isWatchlisted,
  pipelineStatus,
  onToggleWatchlist,
}: DealCardV3Props) {
  const navigate = useNavigate();

  const score = listing.metrics?.score || 0;
  const scoreBand = 
    score >= 85 ? 'A+' :
    score >= 75 ? 'A' :
    score >= 65 ? 'B' :
    score >= 55 ? 'C' :
    score >= 45 ? 'D' : 'F';
  
  const scoreBadgeColor = 
    scoreBand === 'A+' || scoreBand === 'A' ? 'bg-emerald-500' :
    scoreBand === 'B' ? 'bg-blue-500' :
    scoreBand === 'C' ? 'bg-amber-500' :
    'bg-gray-500';

  const grossYield = listing.metrics?.kpis?.gross_yield_pct;
  const netYield = listing.metrics?.kpis?.net_yield_pct;
  const cashflow = listing.metrics?.kpis?.cashflow_monthly;

  const mainImage = listing.images?.[0] || '/placeholder.svg';
  const countryFlag = 
    listing.country === 'GB' ? '🇬🇧' :
    listing.country === 'US' ? '🇺🇸' :
    listing.country === 'ES' ? '🇪🇸' :
    listing.country === 'FR' ? '🇫🇷' :
    listing.country === 'DE' ? '🇩🇪' :
    '🌍';

  const daysOld = listing.created_at 
    ? Math.floor((Date.now() - new Date(listing.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all group">
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={mainImage}
          alt={listing.address_line1}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Score badge overlay */}
        <div className="absolute top-2 left-2">
          <Badge className={`${scoreBadgeColor} text-white font-bold text-lg px-3 py-1`}>
            {scoreBand}
          </Badge>
        </div>

        {/* Watchlist heart */}
        {onToggleWatchlist && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 bg-white/80 hover:bg-white"
            onClick={(e) => {
              e.stopPropagation();
              onToggleWatchlist();
            }}
          >
            <Heart
              className={`h-5 w-5 ${isWatchlisted ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
            />
          </Button>
        )}

        {/* New badge */}
        {daysOld !== null && daysOld <= 1 && (
          <Badge className="absolute bottom-2 left-2 bg-primary text-primary-foreground">
            NEW
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
              <span className="text-lg">{countryFlag}</span>
              <MapPin className="h-3 w-3" />
              <span className="truncate">{listing.city || listing.region}</span>
            </div>
            <h3 className="font-semibold text-lg truncate">
              {listing.address_line1}
            </h3>
            {listing.postcode && (
              <p className="text-sm text-muted-foreground">{listing.postcode}</p>
            )}
          </div>
        </div>

        {/* Price & Rent */}
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(listing.price)}
            </p>
            {listing.estimated_rent && (
              <p className="text-sm text-muted-foreground">
                Rent: {formatCurrency(listing.estimated_rent)}/mo
              </p>
            )}
          </div>
          {pipelineStatus && (
            <Badge variant="outline">{pipelineStatus}</Badge>
          )}
        </div>

        {/* Property details */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {listing.bedrooms && (
            <div className="flex items-center gap-1">
              <Bed className="h-4 w-4" />
              <span>{listing.bedrooms}</span>
            </div>
          )}
          {listing.bathrooms && (
            <div className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              <span>{listing.bathrooms}</span>
            </div>
          )}
          {listing.property_type && (
            <span className="capitalize">{listing.property_type}</span>
          )}
        </div>

        {/* Metrics sparkline */}
        {(grossYield || netYield || cashflow) && (
          <div className="flex items-center gap-3 text-sm p-2 bg-muted/50 rounded">
            {grossYield && (
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                <span className="font-semibold">{grossYield.toFixed(1)}%</span>
                <span className="text-xs text-muted-foreground">Gross</span>
              </div>
            )}
            {netYield && (
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-blue-500" />
                <span className="font-semibold">{netYield.toFixed(1)}%</span>
                <span className="text-xs text-muted-foreground">Net</span>
              </div>
            )}
            {cashflow && (
              <div className="flex items-center gap-1">
                <span className="font-semibold">
                  {formatCurrency(cashflow)}
                </span>
                <span className="text-xs text-muted-foreground">/mo</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1"
            onClick={() => navigate(`/deals/${listing.id}`)}
          >
            Underwrite
          </Button>
          
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="outline" size="icon">
                <Info className="h-4 w-4" />
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Data Provenance</DrawerTitle>
              </DrawerHeader>
              <div className="p-4 space-y-2 text-sm">
                <div>
                  <span className="font-semibold">Source:</span>{' '}
                  <span className="capitalize">{listing.source}</span>
                </div>
                {listing.data_provenance?.fetched_at && (
                  <div>
                    <span className="font-semibold">Fetched:</span>{' '}
                    {new Date(listing.data_provenance.fetched_at).toLocaleString()}
                  </div>
                )}
                {listing.data_provenance?.transformer_version && (
                  <div>
                    <span className="font-semibold">Version:</span>{' '}
                    {listing.data_provenance.transformer_version}
                  </div>
                )}
                {listing.listing_url && (
                  <Button
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => window.open(listing.listing_url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Original Listing
                  </Button>
                )}
              </div>
            </DrawerContent>
          </Drawer>
        </div>

        {/* Source badge */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
          <span className="capitalize">{listing.source}</span>
          {daysOld !== null && (
            <span>{daysOld}d ago</span>
          )}
        </div>
      </div>
    </Card>
  );
}
