import DashboardLayout from "@/components/DashboardLayout";
import { OffMarketFeed } from "@/components/offmarket/OffMarketFeed";
import { EntitlementGuard } from "@/components/EntitlementGuard";
import { PREMIUM_FEATURES } from "@/lib/entitlements";

export default function OffMarket() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Off-Market Intelligence</h1>
          <p className="text-muted-foreground mt-2">
            Discover properties before they hit the public market
          </p>
        </div>

        <EntitlementGuard feature={PREMIUM_FEATURES.OFFMARKET}>
          <OffMarketFeed />
        </EntitlementGuard>
      </div>
    </DashboardLayout>
  );
}
