import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { checkUsageLimit } from "@/lib/planLimits";

interface UsageGuardProps {
  type: "ingests" | "exports";
  children: React.ReactNode;
  onBlock?: () => void;
}

export function UsageGuard({ type, children, onBlock }: UsageGuardProps) {
  const [allowed, setAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState({ used: 0, limit: 0 });

  useEffect(() => {
    checkLimit();
  }, []);

  async function checkLimit() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      const result = await checkUsageLimit(user.id, type);
      setAllowed(result.allowed);
      setUsage({ used: result.used, limit: result.limit });
      setLoading(false);

      if (!result.allowed && onBlock) {
        onBlock();
      }
    } catch (error) {
      console.error("[UsageGuard] Error:", error);
      setLoading(false);
    }
  }

  if (loading) {
    return null;
  }

  if (!allowed) {
    const limitText =
      usage.limit === -1 ? "Unlimited" : `${usage.limit} per month`;

    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Usage Limit Reached</AlertTitle>
        <AlertDescription>
          You've used {usage.used} of your {limitText}{" "}
          {type === "ingests" ? "property imports" : "exports"}. Upgrade your
          plan to continue.
        </AlertDescription>
        <Button className="mt-4" asChild>
          <a href="/billing">Upgrade Plan</a>
        </Button>
      </Alert>
    );
  }

  return <>{children}</>;
}
