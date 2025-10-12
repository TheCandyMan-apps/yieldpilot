import { useState } from "react";
import { Heart, MapPin, Bed, Bath, TrendingUp, DollarSign } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface DealCardProps {
  deal: {
    id: string;
    property_address: string;
    price: number;
    estimated_rent?: number;
    bedrooms?: number;
    bathrooms?: number;
    image_url?: string;
    yield_percentage?: number;
    roi_percentage?: number;
    investment_score?: "A" | "B" | "C" | "D" | "E";
    city?: string;
    property_type?: string;
  };
  isWatchlisted?: boolean;
  onWatchlistToggle?: () => void;
}

const scoreColors = {
  A: "bg-green-500 hover:bg-green-600",
  B: "bg-blue-500 hover:bg-blue-600",
  C: "bg-yellow-500 hover:bg-yellow-600",
  D: "bg-orange-500 hover:bg-orange-600",
  E: "bg-red-500 hover:bg-red-600",
};

const DealCard = ({ deal, isWatchlisted = false, onWatchlistToggle }: DealCardProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [watchlisted, setWatchlisted] = useState(isWatchlisted);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleWatchlistToggle = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to add to watchlist",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      if (watchlisted) {
        const { error } = await supabase
          .from("watchlist")
          .delete()
          .eq("user_id", user.id)
          .eq("deal_id", deal.id);

        if (error) throw error;
        
        setWatchlisted(false);
        toast({
          title: "Removed from watchlist",
          description: "Property removed from your watchlist",
        });
      } else {
        const { error } = await supabase
          .from("watchlist")
          .insert({
            user_id: user.id,
            deal_id: deal.id,
          });

        if (error) throw error;
        
        setWatchlisted(true);
        toast({
          title: "Added to watchlist",
          description: "Property saved to your watchlist",
        });
      }
      
      onWatchlistToggle?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return "N/A";
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative h-48 bg-muted">
        {deal.image_url ? (
          <img
            src={deal.image_url}
            alt={deal.property_address}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <MapPin className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        <button
          onClick={handleWatchlistToggle}
          disabled={isLoading}
          className="absolute top-3 right-3 p-2 rounded-full bg-white/90 hover:bg-white transition-colors disabled:opacity-50"
        >
          <Heart
            className={`h-5 w-5 ${
              watchlisted ? "fill-red-500 text-red-500" : "text-gray-600"
            }`}
          />
        </button>
        {deal.investment_score && (
          <Badge
            className={`absolute top-3 left-3 ${scoreColors[deal.investment_score]} text-white font-bold`}
          >
            Score: {deal.investment_score}
          </Badge>
        )}
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">
          {deal.property_address}
        </h3>
        
        <div className="flex items-center text-sm text-muted-foreground mb-3">
          <MapPin className="h-4 w-4 mr-1" />
          {deal.city || "Location unavailable"}
        </div>

        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl font-bold">{formatCurrency(deal.price)}</span>
          {deal.estimated_rent && (
            <span className="text-sm text-muted-foreground">
              £{deal.estimated_rent}/mo rent
            </span>
          )}
        </div>

        {(deal.bedrooms || deal.bathrooms) && (
          <div className="flex items-center space-x-4 mb-3 text-sm text-muted-foreground">
            {deal.bedrooms && (
              <div className="flex items-center">
                <Bed className="h-4 w-4 mr-1" />
                {deal.bedrooms} bed
              </div>
            )}
            {deal.bathrooms && (
              <div className="flex items-center">
                <Bath className="h-4 w-4 mr-1" />
                {deal.bathrooms} bath
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {deal.yield_percentage !== null && deal.yield_percentage !== undefined && (
            <div className="bg-green-50 dark:bg-green-950 p-2 rounded">
              <div className="flex items-center text-xs text-muted-foreground mb-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                Yield
              </div>
              <div className="font-semibold text-green-700 dark:text-green-400">
                {deal.yield_percentage.toFixed(2)}%
              </div>
            </div>
          )}
          {deal.roi_percentage !== null && deal.roi_percentage !== undefined && (
            <div className="bg-blue-50 dark:bg-blue-950 p-2 rounded">
              <div className="flex items-center text-xs text-muted-foreground mb-1">
                <DollarSign className="h-3 w-3 mr-1" />
                ROI
              </div>
              <div className="font-semibold text-blue-700 dark:text-blue-400">
                {deal.roi_percentage.toFixed(2)}%
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button className="w-full" variant="default">
          Analyze This Deal
        </Button>
      </CardFooter>
    </Card>
  );
};

export default DealCard;
