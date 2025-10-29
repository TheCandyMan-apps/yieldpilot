import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Plus, TrendingUp, DollarSign, Home, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Property {
  id: string;
  address_line1: string;
  price: number;
  bedrooms?: number;
  region: string;
  estimated_yield?: number;
  score?: number;
}

interface PropertyComparisonProps {
  properties: Property[];
  onRemove?: (id: string) => void;
  onAddMore?: () => void;
}

export function PropertyComparison({
  properties,
  onRemove,
  onAddMore,
}: PropertyComparisonProps) {
  const maxProperties = 4;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getScoreColor = (score?: number) => {
    if (!score) return "bg-gray-500";
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Property Comparison</h3>
        {properties.length < maxProperties && onAddMore && (
          <Button onClick={onAddMore} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Property
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {properties.map((property) => (
          <Card key={property.id} className="p-4 relative">
            {onRemove && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={() => onRemove(property.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}

            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-sm line-clamp-2">
                  {property.address_line1}
                </h4>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <MapPin className="h-3 w-3" />
                  {property.region}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Price</span>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    <span className="text-sm font-semibold">
                      {formatPrice(property.price)}
                    </span>
                  </div>
                </div>

                {property.bedrooms && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Bedrooms</span>
                    <div className="flex items-center gap-1">
                      <Home className="h-3 w-3" />
                      <span className="text-sm">{property.bedrooms}</span>
                    </div>
                  </div>
                )}

                {property.estimated_yield && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Est. Yield</span>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      <span className="text-sm font-semibold">
                        {property.estimated_yield.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                )}

                {property.score !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Score</span>
                    <Badge
                      className={`${getScoreColor(property.score)} text-white`}
                    >
                      {property.score}/100
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
