import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Check, Loader2, FileText, Crown, Zap, Users, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UsageProgress } from "@/components/UsageProgress";
import { SubscriptionBadge } from "@/components/SubscriptionBadge";
import { SubscriptionTier } from "@/lib/subscriptionHelpers";
import { getEntitlements, type Entitlement } from "@/lib/entitlements";
import { STRIPE_PRODUCTS } from "@/lib/stripe-config";

const SUBSCRIPTION_TIERS = {
  pro: {
    name: "Pro",
    price: "£39",
    priceId: "price_1SO87xAWv4rktmqksewfIGra",
    productId: "prod_TKnjtL7SEh4si6",
  },
  enterprise: {
    name: "Enterprise",
    price: "£149",
    priceId: "price_1SO8XVAWv4rktmqk9BNILyOP",
    productId: "prod_TKo9PjfjAujttR",
  },
  team: {
    name: "Team",
    price: "£249",
    priceId: "price_1SLpZ5AWv4rktmqkPk9179Ls",
    productId: "prod_TIQPO5z7ZmKw3Q",
  },
};

const AI_REPORT = {
  name: "AI Lease Report",
  price: "£9.99",
  priceId: "price_1SO8pTAWv4rktmqkdNzQsgz5",
  productId: "prod_TKoSPzjpFLy9YR",
};

const Billing = () => {
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [usageStats, setUsageStats] = useState<{ ingests_used: number; exports_used: number; lease_scans: number }>({ ingests_used: 0, exports_used: 0, lease_scans: 0 });

  const checkSubscription = async () => {
    try {
      setCheckingStatus(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get entitlements
      const ent = await getEntitlements(user.id);
      setEntitlement(ent);

      // Fetch usage stats
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const { data: usage } = await supabase
        .from("usage_counters")
        .select("ingests_used, exports_used")
        .eq("user_id", user.id)
        .gte("period_start", periodStart.toISOString())
        .maybeSingle();
      
      const { count: scanCount } = await supabase
        .from("lease_scan_jobs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", periodStart.toISOString());
      
      setUsageStats({ 
        ingests_used: usage?.ingests_used || 0, 
        exports_used: usage?.exports_used || 0,
        lease_scans: scanCount || 0,
      });
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
        "2 exports/month",
        "Basic deal feed",
        "Market insights",
        "1 lease scan/month",
      ],
      priceId: null,
    },
    {
      name: "Pro",
      price: "£39",
      features: [
        "50 property analyses/month",
        "20 exports/month",
        "Full deal feed access",
        "Saved searches & alerts",
        "10 lease scans/month",
        "Priority email support",
      ],
      priceId: STRIPE_PRODUCTS.pro_monthly.priceId,
      popular: true,
    },
    {
      name: "Investor",
      price: "£149",
      features: [
        "500 property analyses/month",
        "200 exports/month",
        "Advanced analytics & insights",
        "Priority alerts",
        "Unlimited lease scans",
        "Team collaboration (3 users)",
        "API access",
      ],
      priceId: STRIPE_PRODUCTS.investor_monthly.priceId,
    },
    {
      name: "Deal Lab",
      price: "£249",
      features: [
        "Unlimited analyses & exports",
        "Unlimited lease scans",
        "Unlimited team members",
        "White-label reports",
        "Dedicated account manager",
        "Custom integrations",
        "SLA guarantee",
      ],
      priceId: STRIPE_PRODUCTS.deal_lab_monthly.priceId,
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
                      <SubscriptionBadge tier={(entitlement?.plan || 'free') as SubscriptionTier} />
                    </div>
                  </div>
                  {entitlement?.plan && entitlement.plan !== "free" ? (
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
                    <Button onClick={() => handleUpgrade(STRIPE_PRODUCTS.pro_monthly.priceId)} disabled={loading}>
                      Upgrade
                    </Button>
                  )}
                </div>
                {entitlement?.expiresAt && (
                  <p className="text-sm text-muted-foreground">
                    Renews on {new Date(entitlement.expiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Usage This Month</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <UsageProgress
                ingestsUsed={usageStats.ingests_used}
                ingestsLimit={
                  entitlement?.plan === "free" ? 5 :
                  entitlement?.plan === "pro" ? 50 :
                  entitlement?.plan === "investor" ? 500 : -1
                }
                exportsUsed={usageStats.exports_used}
                exportsLimit={
                  entitlement?.plan === "free" ? 2 :
                  entitlement?.plan === "pro" ? 20 :
                  entitlement?.plan === "investor" ? 200 : -1
                }
              />
              <div className="pt-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Lease Scans</span>
                  <span className="font-medium">
                    {usageStats.lease_scans} / {
                      entitlement?.plan === "free" ? "1" :
                      entitlement?.plan === "pro" ? "10" : "∞"
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isCurrent = plan.name.toLowerCase() === entitlement?.plan;
            const Icon = plan.name === "Pro" ? Crown : plan.name === "Investor" ? Rocket : plan.name === "Deal Lab" ? Users : Zap;
            
            return (
              <Card 
                key={plan.name} 
                className={`relative ${
                  (plan as any).popular ? "border-primary shadow-lg" : ""
                } ${isCurrent ? "ring-2 ring-primary" : ""}`}
              >
                {(plan as any).popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="h-6 w-6 text-primary" />
                    {isCurrent && (
                      <Badge variant="secondary">Current</Badge>
                    )}
                  </div>
                  <CardTitle>{plan.name}</CardTitle>
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
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start text-sm">
                        <Check className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={(plan as any).popular ? "default" : "outline"}
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
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Pay-Per-Report
            </CardTitle>
            <CardDescription>
              Need a one-time lease analysis? Purchase individual AI reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">{AI_REPORT.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  AI-powered lease analysis with risk scoring, ROI adjustment, and recommendations
                </p>
                <p className="text-2xl font-bold">{AI_REPORT.price}</p>
              </div>
              <div className="text-sm text-muted-foreground max-w-xs">
                Available when uploading a lease in the Lease Scanner
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground py-4">
          <p>🔒 Secure payment processing by Stripe</p>
          <p className="mt-1">Cancel anytime. No hidden fees.</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Billing;
