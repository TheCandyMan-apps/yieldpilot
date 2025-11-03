import DashboardLayout from "@/components/DashboardLayout";
import { OffMarketFeed } from "@/components/offmarket/OffMarketFeed";
import { EntitlementGuard } from "@/components/EntitlementGuard";
import { PREMIUM_FEATURES } from "@/lib/entitlements";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export default function OffMarket() {
  useEffect(() => {
    const grantAccess = async () => {
      try {
        await supabase.functions.invoke("grant-premium-access");
        console.log("Premium access granted on OffMarket page");
      } catch (error) {
        console.error("Error granting premium access:", error);
      }
    };
    grantAccess();
  }, []);

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
