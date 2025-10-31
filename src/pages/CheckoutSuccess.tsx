import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getEntitlements } from "@/lib/entitlements";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Loader2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refreshEntitlements();
  }, []);

  async function refreshEntitlements() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("User not found");
        setIsRefreshing(false);
        return;
      }

      // Wait a moment for Stripe webhook to process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Refresh entitlements
      const entitlements = await getEntitlements(user.id);
      
      if (entitlements) {
        console.log("Entitlements refreshed:", entitlements);
      }

      setIsRefreshing(false);

      // Redirect to billing page after 3 seconds
      setTimeout(() => {
        navigate("/billing");
      }, 3000);
    } catch (err) {
      console.error("Error refreshing entitlements:", err);
      setError("Failed to refresh subscription status");
      setIsRefreshing(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="container max-w-2xl mx-auto py-12">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              {isRefreshing ? (
                <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
              ) : (
                <CheckCircle className="w-8 h-8 text-green-600" />
              )}
            </div>
            <CardTitle className="text-2xl">Payment Successful!</CardTitle>
            <CardDescription>
              {isRefreshing
                ? "Activating your subscription..."
                : "Your subscription has been activated"}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            {!error && !isRefreshing && (
              <p className="text-sm text-muted-foreground">
                Redirecting you to your billing page...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
