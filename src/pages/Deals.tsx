import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { EnhancedDealCard } from "@/components/deals/EnhancedDealCard";
import DealFilters, { FilterValues } from "@/components/deals/DealFilters";
import { LocationSearch } from "@/components/deals/LocationSearch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Deal {
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
  city: string | null;
  property_type?: string;
  postcode: string | null;
  listing_url: string | null;
}

const Deals = () => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [filteredDeals, setFilteredDeals] = useState<Deal[]>([]);
  const [watchlistedIds, setWatchlistedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterValues>({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialLocation = searchParams.get('location') || '';

  // Simple county-to-postcode prefix mapping (helps when listings don't include the county name)
  const countyPostcodePrefixes: Record<string, string[]> = {
    surrey: ['gu', 'kt', 'rh', 'sm'],
  };

  const norm = (s: string | null | undefined) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const matchesLocation = (deal: Deal, location: string) => {
    const target = norm(location);
    const addr = norm(deal.property_address);
    const city = norm(deal.city);
    const pc = norm(deal.postcode);

    // Direct substring match against address, city, or postcode
    if (addr.includes(target) || city.includes(target) || pc.includes(target)) return true;

    // County fallback via postcode area prefixes
    const prefixes = countyPostcodePrefixes[target];
    if (prefixes && pc) {
      const pcPrefix = pc.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 2);
      if (prefixes.some((p) => pcPrefix.startsWith(p))) return true;
    }

    return false;
  };
  useEffect(() => {
    checkAuth();

    // Realtime: refresh when new deals are inserted
    const channel = supabase
      .channel('deals-feed-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'deals_feed' },
        () => {
          fetchDeals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAuthenticated(!!user);
    fetchDeals();
    if (user) {
      fetchWatchlist(user.id);
    }
  };

  const fetchDeals = async () => {
    try {
      const { data, error } = await supabase
        .from("deals_feed")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setDeals(data || []);
      // If a location was provided in the URL (coming from SyncProgress), pre-filter results
      if (initialLocation) {
        const filtered = (data || []).filter((deal) => matchesLocation(deal, initialLocation));
        setFilteredDeals(filtered.length > 0 ? filtered : (data || []));
      } else {
        setFilteredDeals(data || []);
      }
    } catch (error: any) {
      toast({
        title: "Error loading deals",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchWatchlist = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("watchlist")
        .select("deal_id")
        .eq("user_id", userId);

      if (error) throw error;

      setWatchlistedIds(new Set(data.map((item) => item.deal_id)));
    } catch (error: any) {
      console.error("Error fetching watchlist:", error);
    }
  };

  const applyFilters = (filterValues: FilterValues) => {
    setFilters(filterValues);
    
    let filtered = [...deals];

    // Search filter
    if (filterValues.search) {
      const searchLower = filterValues.search.toLowerCase();
      filtered = filtered.filter(
        (deal) =>
          deal.property_address.toLowerCase().includes(searchLower) ||
          deal.city?.toLowerCase().includes(searchLower)
      );
    }

    // Price filters
    if (filterValues.minPrice) {
      filtered = filtered.filter((deal) => deal.price >= filterValues.minPrice!);
    }
    if (filterValues.maxPrice) {
      filtered = filtered.filter((deal) => deal.price <= filterValues.maxPrice!);
    }

    // Yield filter
    if (filterValues.minYield) {
      filtered = filtered.filter(
        (deal) => deal.yield_percentage && deal.yield_percentage >= filterValues.minYield!
      );
    }

    // ROI filter
    if (filterValues.minROI) {
      filtered = filtered.filter(
        (deal) => deal.roi_percentage && deal.roi_percentage >= filterValues.minROI!
      );
    }

    // Property type filter
    if (filterValues.propertyType) {
      filtered = filtered.filter((deal) => deal.property_type === filterValues.propertyType);
    }

    // City filter
    if (filterValues.city) {
      filtered = filtered.filter((deal) => deal.city === filterValues.city);
    }

    // Investment score filter
    if (filterValues.investmentScore) {
      const scoreOrder = ["A", "B", "C", "D", "E"];
      const minScoreIndex = scoreOrder.indexOf(filterValues.investmentScore);
      filtered = filtered.filter((deal) => {
        if (!deal.investment_score) return false;
        return scoreOrder.indexOf(deal.investment_score) <= minScoreIndex;
      });
    }

    setFilteredDeals(filtered);
  };

  const handleGenerateSampleDeals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("seed-sample-deals");
      
      if (error) throw error;
      
      toast({
        title: "Sample deals generated!",
        description: `Successfully added ${data.data?.length || 6} sample properties to the feed`,
      });
      
      // Refresh the deals list
      fetchDeals();
    } catch (error: any) {
      toast({
        title: "Error generating sample deals",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Deal Feed</h1>
          <p className="text-muted-foreground mt-1">
            AI-analyzed investment opportunities
          </p>
        </div>

        {/* Location Search */}
        <div className="bg-card rounded-lg border p-6 shadow-sm">
          <div className="flex flex-col items-center gap-4">
            <LocationSearch 
              defaultLocation={initialLocation}
              onSearchComplete={fetchDeals}
            />
            {isAuthenticated && (
              <Button 
                onClick={handleGenerateSampleDeals}
                variant="outline"
                size="sm"
              >
                Generate Sample Deals
              </Button>
            )}
          </div>
        </div>

        {/* Limited Preview Banner */}
        {!isAuthenticated && deals.length > 0 && (
          <Alert className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
            <Lock className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold mb-1">🔓 Viewing Limited Preview</p>
                <p className="text-sm text-muted-foreground">
                  You're seeing {deals.length} sample deals. Sign up free to access {deals.length > 10 ? '80+' : 'all'} investment opportunities with full AI analysis, yield calculations, and export features.
                </p>
              </div>
              <Button 
                onClick={() => navigate("/auth")} 
                size="sm"
                className="ml-4 flex-shrink-0"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Sign Up Free
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <DealFilters onFilterChange={applyFilters} />

        {/* No matches notice for location */}
        {initialLocation && (() => {
          const hasMatches = deals.some((d) => matchesLocation(d, initialLocation));
          return !hasMatches ? (
            <div className="text-sm text-muted-foreground p-3 rounded-md border border-border/50 bg-muted/30">
              No properties found for "{initialLocation}". Showing all available deals.
            </div>
          ) : null;
        })()}

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          {(() => {
            const hasMatches = initialLocation && deals.some((d) => matchesLocation(d, initialLocation));
            return (
              <>
                Showing {filteredDeals.length} of {deals.length} deals{hasMatches ? ` matching "${initialLocation}"` : ''}
                {!isAuthenticated && deals.length >= 10 && (
                  <span className="ml-2 text-primary font-medium">
                    • Sign up to see 70+ more deals
                  </span>
                )}
              </>
            );
          })()}
        </div>

        {/* Deals Grid */}
        {filteredDeals.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No deals match your filters. Try adjusting your criteria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDeals.map((deal) => (
              <EnhancedDealCard
                key={deal.id}
                deal={deal}
                isWatchlisted={watchlistedIds.has(deal.id)}
                onWatchlistToggle={() => checkAuth()}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Deals;
