import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEntitlements, type Entitlement } from "@/lib/entitlements";
import { UpsellModal } from "./UpsellModal";

interface EntitlementGuardProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function EntitlementGuard({ feature, children, fallback }: EntitlementGuardProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [showUpsell, setShowUpsell] = useState(false);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);

  useEffect(() => {
    checkAccess();
  }, [feature]);

  // Refresh access check when component mounts or when returning from other pages
  useEffect(() => {
    const interval = setInterval(checkAccess, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  async function checkAccess() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setHasAccess(false);
      return;
    }

    const ent = await getEntitlements(user.id);
    setEntitlement(ent);
    
    if (!ent || !ent.isActive) {
      setHasAccess(false);
      return;
    }

    setHasAccess(ent.features.includes(feature));
  }

  if (hasAccess === null) {
    return null;
  }

  if (!hasAccess) {
    return (
      <>
        {fallback || (
          <div className="flex flex-col items-center justify-center p-8 bg-muted/50 rounded-lg border-2 border-dashed">
            <h3 className="text-xl font-semibold mb-2">Premium Feature</h3>
            <p className="text-muted-foreground mb-4">Upgrade to access this feature</p>
            <button 
              onClick={() => setShowUpsell(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              View Plans
            </button>
          </div>
        )}
        <UpsellModal
          open={showUpsell}
          onOpenChange={setShowUpsell}
          feature={feature}
          currentPlan={entitlement?.plan || 'free'}
        />
      </>
    );
  }

  return <>{children}</>;
}
