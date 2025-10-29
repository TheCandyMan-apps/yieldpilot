import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Eye, MapPin, Bed, Bath, Home, TrendingUp, Brain, ExternalLink } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DealSummaryGenerator from "./DealSummaryGenerator";
import { MultiCurrencyPrice } from "./MultiCurrencyPrice";
import { MarketBadge } from "./MarketBadge";

interface Deal {
  id: string;
  property_address: string;
  city: string | null;
  postcode: string | null;
  price: number;
  estimated_rent?: number;
  bedrooms?: number;
  bathrooms?: number;
  yield_percentage?: number;
  roi_percentage?: number;
  investment_score?: string;
  image_url?: string;
  listing_url: string | null;
  property_type?: string;
  region?: string;
  currency?: string;
  source?: string;
}

interface EnhancedDealCardProps {
  deal: Deal;
  isWatchlisted: boolean;
  onWatchlistToggle: (dealId: string) => void;
  personalizedScore?: number;
  aiInsight?: string;
}

export const EnhancedDealCard = ({ 
  deal, 
  isWatchlisted, 
  onWatchlistToggle,
  personalizedScore,
  aiInsight 
}: EnhancedDealCardProps) => {
  const [trackingView, setTrackingView] = useState(false);

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
            deal_id: deal.id,
            interaction_type: "viewed"
          });
        }
      } catch (error) {
        console.error("Error tracking view:", error);
      }
    }
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return "bg-gray-100 text-gray-800";
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-orange-100 text-orange-800";
  };

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 group">
      {/* Image */}
      <div className="relative h-48 bg-muted overflow-hidden">
        {deal.image_url ? (
          <img
            src={deal.image_url}
            alt={deal.property_address}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <Home className="h-16 w-16 text-primary/30" />
          </div>
        )}
        
        {/* Watchlist Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 bg-white/90 hover:bg-white shadow-md"
          onClick={() => onWatchlistToggle(deal.id)}
        >
          <Heart
            className={`h-5 w-5 ${isWatchlisted ? "fill-red-500 text-red-500" : "text-gray-600"}`}
          />
        </Button>

        {/* Personalized Score & Market Badge */}
        <div className="absolute top-2 left-2 flex gap-2">
          {personalizedScore && (
            <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
              <Brain className="h-4 w-4" />
              {personalizedScore}/100
            </div>
          )}
          <MarketBadge 
            region={deal.region || "UK"} 
            source={deal.source}
          />
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Location */}
        <div className="space-y-1">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm line-clamp-1">{deal.property_address}</h3>
              <p className="text-xs text-muted-foreground">
                {deal.city}{deal.postcode ? `, ${deal.postcode}` : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Price & Rent */}
        <div className="flex items-center justify-between">
          <div>
            <MultiCurrencyPrice 
              amount={deal.price} 
              sourceCurrency={deal.currency || "GBP"} 
              sourceRegion={deal.region}
              className="text-lg font-bold"
            />
            {deal.estimated_rent && (
              <MultiCurrencyPrice 
                amount={deal.estimated_rent}
                sourceCurrency={deal.currency || "GBP"}
                sourceRegion={deal.region}
                className="text-xs text-muted-foreground"
              />
            )}
          </div>
          <div className="text-right">
            {deal.yield_percentage && (
              <p className="text-lg font-bold text-primary">
                {deal.yield_percentage.toFixed(1)}%
              </p>
            )}
            <p className="text-xs text-muted-foreground">Yield</p>
          </div>
        </div>

        {/* Property Details */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {deal.bedrooms && (
            <span className="flex items-center gap-1">
              <Bed className="h-4 w-4" />
              {deal.bedrooms}
            </span>
          )}
          {deal.bathrooms && (
            <span className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              {deal.bathrooms}
            </span>
          )}
          {deal.property_type && (
            <Badge variant="outline" className="text-xs">
              {deal.property_type}
            </Badge>
          )}
        </div>

        {/* AI Insight */}
        {aiInsight && (
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-3">
            <p className="text-xs text-primary flex items-start gap-2">
              <Brain className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{aiInsight}</span>
            </p>
          </div>
        )}

        {/* ROI Badge */}
        {deal.roi_percentage && (
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs text-muted-foreground">Projected ROI</span>
            <Badge className={getScoreColor(deal.roi_percentage)}>
              <TrendingUp className="h-3 w-3 mr-1" />
              {deal.roi_percentage.toFixed(1)}%
            </Badge>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <DealSummaryGenerator
            deal={deal}
            trigger={
              <Button 
                variant="outline" 
                className="flex-1" 
                size="sm"
                onClick={handleViewDeal}
              >
                <Eye className="h-4 w-4 mr-2" />
                Analyze
              </Button>
            }
          />
          {deal.listing_url && (
            <Button 
              variant="default" 
              size="sm"
              onClick={() => window.open(deal.listing_url!, "_blank")}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
