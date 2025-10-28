import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UsageProgress } from "@/components/UsageProgress";
import { SubscriptionBadge } from "@/components/SubscriptionBadge";
import { SubscriptionTier } from "@/lib/subscriptionHelpers";

const SUBSCRIPTION_TIERS = {
  pro: {
    name: "Pro",
    price: "£29",
    priceId: "price_1SLpPpAWv4rktmqkpaH3qBnm",
    productId: "prod_TIQGr19KW6WSf2",
  },
  investor: {
    name: "Investor",
    price: "£99",
    priceId: "price_1SLpQ8AWv4rktmqkOqgFM8cg",
    productId: "prod_TIQG8NQ9FVZHVD",
  },
  team: {
    name: "Team",
    price: "£249",
    priceId: "price_1SLpZ5AWv4rktmqkPk9179Ls",
    productId: "prod_TIQPO5z7ZmKw3Q",
  },
};

const Billing = () => {
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [subscriptionTier, setSubscriptionTier] = useState<string>("free");
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [usageStats, setUsageStats] = useState<{ ingests_used: number; exports_used: number } | null>(null);

  const checkSubscription = async () => {
    try {
      setCheckingStatus(true);
      const { data, error } = await supabase.functions.invoke("check-subscription");
      
      if (error) throw error;
      
      if (data) {
        setSubscriptionTier(data.subscription_tier || "free");
        setSubscriptionEnd(data.subscription_end);
      }

      // Fetch usage stats
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const { data: usage } = await supabase
          .from("usage_counters")
          .select("ingests_used, exports_used")
          .eq("user_id", user.id)
          .gte("period_start", periodStart.toISOString())
          .maybeSingle();
        
        setUsageStats(usage || { ingests_used: 0, exports_used: 0 });
      }
    } catch (error: any) {
      console.error("Error checking subscription:", error);
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    checkSubscription();
    
    // Check subscription periodically
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleUpgrade = async (priceId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      console.error("Error creating checkout:", error);
      toast.error("Failed to start checkout process");
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("customer-portal");

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      console.error("Error opening customer portal:", error);
      toast.error("Failed to open subscription management");
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      name: "Free",
      price: "£0",
      features: [
        "5 property analyses/month",
        "Basic deal feed access",
        "Investment simulator",
        "Market insights",
      ],
      priceId: null,
    },
    {
      name: "Pro",
      price: "£29",
      features: [
        "Unlimited property analyses",
        "Full deal feed access",
        "Priority alerts",
        "Advanced analytics",
        "Export to PDF",
        "Email support",
      ],
      priceId: SUBSCRIPTION_TIERS.pro.priceId,
    },
    {
      name: "Investor",
      price: "£99",
      features: [
        "Everything in Pro",
        "Portfolio tracking",
        "Team collaboration (3 users)",
        "API access",
        "White-label reports",
        "Priority support",
      ],
      priceId: SUBSCRIPTION_TIERS.investor.priceId,
    },
    {
      name: "Team",
      price: "£249",
      features: [
        "Everything in Investor",
        "Unlimited team members",
        "Advanced team permissions",
        "Dedicated account manager",
        "Custom integrations",
        "SLA guarantee",
      ],
      priceId: SUBSCRIPTION_TIERS.team.priceId,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Billing & Plans</h1>
          <p className="text-muted-foreground mt-1">
            Choose the plan that works best for you
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-blue-200 dark:border-blue-800">
            <CardContent className="py-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Current Plan</p>
                    <div className="flex items-center gap-2">
                      <SubscriptionBadge tier={subscriptionTier as SubscriptionTier} />
                    </div>
                  </div>
                  {subscriptionTier !== "free" ? (
                    <Button 
                      onClick={handleManageSubscription} 
                      disabled={loading || checkingStatus}
                      variant="outline"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Manage"
                      )}
                    </Button>
                  ) : (
                    <Button onClick={() => handleUpgrade(SUBSCRIPTION_TIERS.pro.priceId)} disabled={loading}>
                      Upgrade
                    </Button>
                  )}
                </div>
                {subscriptionEnd && (
                  <p className="text-sm text-muted-foreground">
                    Renews on {new Date(subscriptionEnd).toLocaleDateString()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {usageStats && (
            <UsageProgress
              ingestsUsed={usageStats.ingests_used}
              ingestsLimit={
                subscriptionTier === "free" ? 5 :
                subscriptionTier === "starter" ? 50 :
                subscriptionTier === "pro" ? 500 : -1
              }
              exportsUsed={usageStats.exports_used}
              exportsLimit={
                subscriptionTier === "free" ? 2 :
                subscriptionTier === "starter" ? 20 :
                subscriptionTier === "pro" ? 200 : -1
              }
            />
          )}
        </div>

        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isCurrent = plan.name.toLowerCase() === subscriptionTier;
            return (
              <Card key={plan.name} className={isCurrent ? "border-primary" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {plan.name}
                    {isCurrent && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                        Current
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    <span className="text-3xl font-bold text-foreground">
                      {plan.price}
                    </span>
                    {plan.price !== "£0" && (
                      <span className="text-muted-foreground">/month</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start text-sm">
                        <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={isCurrent ? "outline" : "default"}
                    disabled={isCurrent || loading || checkingStatus || !plan.priceId}
                    onClick={() => plan.priceId && handleUpgrade(plan.priceId)}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : isCurrent ? (
                      "Current Plan"
                    ) : (
                      "Upgrade"
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Secure Payment Processing
            </CardTitle>
            <CardDescription>
              All plans include secure, encrypted payment processing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              We accept all major credit cards and process payments securely through industry-standard encryption.
            </p>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>✓ 256-bit SSL encryption</span>
              <span>✓ PCI compliant</span>
              <span>✓ Cancel anytime</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Billing;
