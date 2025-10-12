import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const Billing = () => {
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
      current: true,
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
      current: false,
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
      current: false,
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
      current: false,
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

        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Current Plan: Free</p>
                <p className="text-sm text-muted-foreground">
                  3 of 5 analyses used this month
                </p>
              </div>
              <Button>Upgrade Now</Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <Card key={plan.name} className={plan.current ? "border-primary" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  {plan.current && (
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
                  variant={plan.current ? "outline" : "default"}
                  disabled={plan.current}
                >
                  {plan.current ? "Current Plan" : "Upgrade"}
                </Button>
              </CardContent>
            </Card>
          ))}
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
