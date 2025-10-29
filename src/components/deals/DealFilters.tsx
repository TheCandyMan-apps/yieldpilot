import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

interface DealFiltersProps {
  onFilterChange: (filters: FilterValues) => void;
}

export interface FilterValues {
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  minYield?: number;
  minROI?: number;
  propertyType?: string;
  city?: string;
  investmentScore?: string;
  region?: string;
}

const DealFilters = ({ onFilterChange }: DealFiltersProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filters, setFilters] = useState<FilterValues>({});

  const handleFilterUpdate = (key: keyof FilterValues, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    setFilters({});
    onFilterChange({});
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by location or postcode..."
            className="pl-10"
            value={filters.search || ""}
            onChange={(e) => handleFilterUpdate("search", e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Price Range */}
              <div className="space-y-2">
                <Label>Min Price</Label>
                <Select
                  value={filters.minPrice?.toString() || "none"}
                  onValueChange={(value) =>
                    handleFilterUpdate("minPrice", value === "none" ? undefined : Number(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No minimum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No minimum</SelectItem>
                    <SelectItem value="50000">£50,000</SelectItem>
                    <SelectItem value="100000">£100,000</SelectItem>
                    <SelectItem value="150000">£150,000</SelectItem>
                    <SelectItem value="200000">£200,000</SelectItem>
                    <SelectItem value="300000">£300,000</SelectItem>
                    <SelectItem value="500000">£500,000</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Max Price</Label>
                <Select
                  value={filters.maxPrice?.toString() || "none"}
                  onValueChange={(value) =>
                    handleFilterUpdate("maxPrice", value === "none" ? undefined : Number(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No maximum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No maximum</SelectItem>
                    <SelectItem value="100000">£100,000</SelectItem>
                    <SelectItem value="200000">£200,000</SelectItem>
                    <SelectItem value="300000">£300,000</SelectItem>
                    <SelectItem value="500000">£500,000</SelectItem>
                    <SelectItem value="750000">£750,000</SelectItem>
                    <SelectItem value="1000000">£1,000,000</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Yield & ROI */}
              <div className="space-y-2">
                <Label>Min Yield %</Label>
                <Select
                  value={filters.minYield?.toString() || "none"}
                  onValueChange={(value) =>
                    handleFilterUpdate("minYield", value === "none" ? undefined : Number(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any yield" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Any yield</SelectItem>
                    <SelectItem value="3">3%+</SelectItem>
                    <SelectItem value="4">4%+</SelectItem>
                    <SelectItem value="5">5%+</SelectItem>
                    <SelectItem value="6">6%+</SelectItem>
                    <SelectItem value="8">8%+</SelectItem>
                    <SelectItem value="10">10%+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Min ROI %</Label>
                <Select
                  value={filters.minROI?.toString() || "none"}
                  onValueChange={(value) =>
                    handleFilterUpdate("minROI", value === "none" ? undefined : Number(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any ROI" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Any ROI</SelectItem>
                    <SelectItem value="5">5%+</SelectItem>
                    <SelectItem value="10">10%+</SelectItem>
                    <SelectItem value="15">15%+</SelectItem>
                    <SelectItem value="20">20%+</SelectItem>
                    <SelectItem value="25">25%+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Property Type */}
              <div className="space-y-2">
                <Label>Property Type</Label>
                <Select
                  value={filters.propertyType || "all"}
                  onValueChange={(value) =>
                    handleFilterUpdate("propertyType", value === "all" ? undefined : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="residential">Residential</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="hmo">HMO</SelectItem>
                    <SelectItem value="land">Land</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Investment Score */}
              <div className="space-y-2">
                <Label>Min Score</Label>
                <Select
                  value={filters.investmentScore || "any"}
                  onValueChange={(value) =>
                    handleFilterUpdate("investmentScore", value === "any" ? undefined : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any score" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any score</SelectItem>
                    <SelectItem value="A">A only</SelectItem>
                    <SelectItem value="B">B or better</SelectItem>
                    <SelectItem value="C">C or better</SelectItem>
                    <SelectItem value="D">D or better</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Market / Region */}
              <div className="space-y-2">
                <Label>Market</Label>
                <Select
                  value={filters.region || "all"}
                  onValueChange={(value) =>
                    handleFilterUpdate("region", value === "all" ? undefined : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All markets" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All markets</SelectItem>
                    <SelectItem value="UK">🇬🇧 United Kingdom</SelectItem>
                    <SelectItem value="US">🇺🇸 United States</SelectItem>
                    <SelectItem value="DE">🇩🇪 Germany</SelectItem>
                    <SelectItem value="ES">🇪🇸 Spain</SelectItem>
                    <SelectItem value="FR">🇫🇷 France</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* City */}
              <div className="space-y-2">
                <Label>City</Label>
                <Select
                  value={filters.city || "all"}
                  onValueChange={(value) =>
                    handleFilterUpdate("city", value === "all" ? undefined : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All cities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All cities</SelectItem>
                    <SelectItem value="London">London</SelectItem>
                    <SelectItem value="Manchester">Manchester</SelectItem>
                    <SelectItem value="Birmingham">Birmingham</SelectItem>
                    <SelectItem value="Leeds">Leeds</SelectItem>
                    <SelectItem value="Liverpool">Liverpool</SelectItem>
                    <SelectItem value="Bristol">Bristol</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reset Button */}
              <div className="space-y-2 flex items-end">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleReset}
                >
                  Reset Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DealFilters;
