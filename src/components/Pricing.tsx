import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { HelpTooltip } from "@/components/HelpTooltip";

const tiers = [
  {
    name: "Free",
    price: "£0",
    description: "Perfect for trying out YieldPilot",
    features: [
      "3 analyses per month",
      "Basic ROI & yield calculations",
      "Limited property data",
      "Community support",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "£19",
    period: "/month",
    description: "For active property investors",
    features: [
      "Unlimited analyses",
      "Advanced metrics & forecasts",
      "Export PDF reports",
      "Mortgage comparison",
      "Email support",
      "API access",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Investor",
    price: "£49",
    period: "/month",
    description: "For professional portfolios",
    features: [
      "Everything in Pro",
      "Portfolio management",
      "Advanced AI insights",
      "Priority support",
      "Custom branding",
      "Team collaboration",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

const Pricing = () => {
  return (
    <section className="py-24 bg-gradient-to-b from-background to-muted/30" id="pricing">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Simple, Transparent
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"> Pricing</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Invest in the right tool to protect your capital. One avoided bad deal pays for itself—multiple times over.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {tiers.map((tier, index) => (
            <Card 
              key={index}
              className={`relative ${
                tier.highlighted 
                  ? 'border-primary shadow-glow border-2 scale-105' 
                  : 'border-2 hover:border-primary/50'
              } transition-all duration-300`}
            >
              {tier.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-primary to-primary-glow text-primary-foreground text-sm font-semibold rounded-full">
                  Most Popular
                </div>
              )}
              
              <CardHeader>
                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  {tier.period && <span className="text-muted-foreground">{tier.period}</span>}
                </div>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button 
                  className={`w-full ${
                    tier.highlighted 
                      ? 'bg-gradient-to-r from-primary to-primary-glow hover:opacity-90' 
                      : ''
                  }`}
                  variant={tier.highlighted ? 'default' : 'outline'}
                  size="lg"
                >
                  {tier.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
