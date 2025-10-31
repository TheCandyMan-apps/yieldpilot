import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Crown, Rocket, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UpsellModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  currentPlan: string;
}

const PLAN_COMPARISON = [
  {
    name: "Pro",
    icon: Crown,
    price: "$49/mo",
    features: [
      "Off-Market Deals",
      "Stress Testing",
      "API v2 Access",
      "AI Assistant",
      "50 Property Imports/mo",
      "20 Exports/mo",
    ],
    plan: "pro",
  },
  {
    name: "Investor",
    icon: Users,
    price: "$99/mo",
    features: [
      "Everything in Pro",
      "Portfolio Analytics",
      "Deal Lab Access",
      "Unlimited Imports",
      "50 Exports/mo",
      "Priority Support",
    ],
    plan: "investor",
    popular: true,
  },
  {
    name: "Deal Lab",
    icon: Rocket,
    price: "$199/mo",
    features: [
      "Everything in Investor",
      "AI Telemetry",
      "Advanced Forecasting",
      "Unlimited Everything",
      "White-Label Options",
      "Dedicated Account Manager",
    ],
    plan: "deal_lab",
  },
];

export function UpsellModal({ open, onOpenChange, feature, currentPlan }: UpsellModalProps) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate("/billing");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Upgrade to Access Premium Features</DialogTitle>
          <DialogDescription>
            Choose the plan that best fits your investment needs
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-3 gap-6 mt-6">
          {PLAN_COMPARISON.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = plan.plan === currentPlan;

            return (
              <div
                key={plan.name}
                className={`relative rounded-lg border-2 p-6 ${
                  plan.popular
                    ? "border-primary shadow-lg"
                    : "border-border"
                } ${isCurrent ? "opacity-60" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                      MOST POPULAR
                    </span>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-secondary text-secondary-foreground text-xs font-bold px-3 py-1 rounded-full">
                      CURRENT PLAN
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <Icon className="h-12 w-12 mx-auto mb-3 text-primary" />
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <div className="text-3xl font-bold">{plan.price}</div>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={handleUpgrade}
                  disabled={isCurrent}
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                >
                  {isCurrent ? "Current Plan" : "Upgrade Now"}
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
