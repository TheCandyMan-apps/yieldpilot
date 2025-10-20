import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { DealCardV2 } from "@/components/deals/DealCardV2";
import { ZooplaSyncButton } from "@/components/deals/ZooplaSyncButton";
import { RightmoveSyncButton } from "@/components/deals/RightmoveSyncButton";
import { AssumptionsDrawer } from "@/components/deals/AssumptionsDrawer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ListingMetric {
  listing_id: string;
  score: number | null;
  drivers: string[];
  risks: string[];
  kpis: any;
  enrichment: any;
}

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
  listing_metrics: ListingMetric[];
}

const DealsV2 = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [watchlistedIds, setWatchlistedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [minYield, setMinYield] = useState<number>();
  const [maxPrice, setMaxPrice] = useState<number>();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [globalAssumptions, setGlobalAssumptions] = useState({
    deposit_pct: 25,
    apr: 5.5,
    term_years: 25,
    interest_only: true,
    voids_pct: 5,
    maintenance_pct: 8,
    management_pct: 10,
    insurance_annual: 300,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [listings, searchTerm, minYield, maxPrice]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchListings();
    fetchWatchlist(user.id);
  };

  const fetchListings = async () => {
    try {
      // Use raw query to avoid type inference issues
      const { data: listingsData, error: listingsError } = await (supabase as any)
        .from("listings")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (listingsError) throw listingsError;

      if (!listingsData || listingsData.length === 0) {
        setListings([]);
        setFilteredListings([]);
        setLoading(false);
        return;
      }

      // Fetch metrics separately
      const listingIds = listingsData.map((l: any) => l.id);
      const { data: metricsData, error: metricsError } = await (supabase as any)
        .from("listing_metrics")
        .select("*")
        .in("listing_id", listingIds);

      if (metricsError) console.error("Error fetching metrics:", metricsError);

      // Combine the data
      const combinedData: Listing[] = listingsData.map((listing: any) => ({
        id: listing.id,
        address_line1: listing.address_line1,
        address_town: listing.address_town,
        postcode: listing.postcode,
        price: listing.price,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        property_type: listing.property_type,
        images: listing.images || [],
        source_refs: listing.source_refs || [],
        listing_metrics: metricsData?.filter((m: any) => m.listing_id === listing.id) || []
      }));

      setListings(combinedData);
      setFilteredListings(combinedData);
    } catch (error: any) {
      toast({
        title: "Error loading listings",
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

  const applyFilters = () => {
    let filtered = [...listings];

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.address_line1?.toLowerCase().includes(lower) ||
          l.address_town?.toLowerCase().includes(lower) ||
          l.postcode?.toLowerCase().includes(lower)
      );
    }

    if (maxPrice) {
      filtered = filtered.filter((l) => l.price <= maxPrice);
    }

    if (minYield) {
      filtered = filtered.filter((l) => {
        const yieldPct = l.listing_metrics?.[0]?.kpis?.gross_yield_pct;
        return yieldPct && yieldPct >= minYield;
      });
    }

    setFilteredListings(filtered);
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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Smart Deal Feed</h1>
            <p className="text-muted-foreground mt-1">
              AI-analyzed property investment opportunities with explainable scoring
            </p>
          </div>
          <div className="flex gap-2">
            <AssumptionsDrawer 
              assumptions={globalAssumptions} 
              onUpdate={setGlobalAssumptions}
            />
            <ZooplaSyncButton onSyncComplete={fetchListings} />
            <RightmoveSyncButton onSyncComplete={fetchListings} />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Search by location or postcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Input
            type="number"
            placeholder="Min Yield %"
            value={minYield || ""}
            onChange={(e) => setMinYield(e.target.value ? parseFloat(e.target.value) : undefined)}
            className="w-full sm:w-32"
          />
          <Input
            type="number"
            placeholder="Max Price £"
            value={maxPrice || ""}
            onChange={(e) => setMaxPrice(e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full sm:w-32"
          />
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          Showing {filteredListings.length} of {listings.length} deals
        </div>

        {/* Deals Grid */}
        {filteredListings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No deals match your filters. Try adjusting your criteria or sync new listings.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => (
              <DealCardV2
                key={listing.id}
                listing={listing}
                isWatchlisted={watchlistedIds.has(listing.id)}
                onWatchlistToggle={() => checkAuth()}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DealsV2;
