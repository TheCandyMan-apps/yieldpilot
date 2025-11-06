import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X } from "lucide-react";
import { HelpTooltip } from "@/components/HelpTooltip";

const strategies = [
  {
    name: "Buy-to-Let",
    bestFor: "Steady Income",
    avgYield: "5-7%",
    capital: "Medium",
    management: "Active",
    riskLevel: "Low-Medium",
    features: {
      "Steady rental income": true,
      "Capital appreciation": true,
      "Tax deductions available": true,
      "Requires tenant management": true,
      "Mortgage interest relief": false,
      "Quick liquidity": false
    }
  },
  {
    name: "HMO",
    bestFor: "High Yields",
    avgYield: "8-12%",
    capital: "Medium-High",
    management: "Very Active",
    riskLevel: "Medium",
    features: {
      "Steady rental income": true,
      "Capital appreciation": true,
      "Tax deductions available": true,
      "Requires tenant management": true,
      "Mortgage interest relief": false,
      "Quick liquidity": false
    }
  },
  {
    name: "Development",
    bestFor: "Capital Growth",
    avgYield: "15-25%",
    capital: "High",
    management: "Very Active",
    riskLevel: "High",
    features: {
      "Steady rental income": false,
      "Capital appreciation": true,
      "Tax deductions available": true,
      "Requires tenant management": false,
      "Mortgage interest relief": false,
      "Quick liquidity": true
    }
  }
];

const ComparisonTable = () => {
  return (
    <section className="py-20 bg-accent/30" id="comparison">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            Compare Investment <span className="text-primary">Strategies</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Find the right approach for your investment goals and risk tolerance
          </p>
        </div>

        <div className="max-w-6xl mx-auto overflow-x-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {strategies.map((strategy, index) => (
              <Card key={index} className="border-2 hover-scale">
                <CardHeader className="text-center bg-primary/5">
                  <div className="flex items-center justify-center gap-2">
                    <CardTitle className="text-2xl mb-2">{strategy.name}</CardTitle>
                    <HelpTooltip 
                      content={
                        strategy.name === "Buy-to-Let" 
                          ? "Traditional rental property with single tenancy. Lower yields but simpler management and lower risk"
                          : strategy.name === "HMO"
                          ? "House in Multiple Occupation with individual room rentals. Higher yields but requires licensing and more intensive management"
                          : "Property development or renovation for resale. Highest returns but requires significant capital and active project management"
                      }
                      side="bottom"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">{strategy.bestFor}</p>
                  <div className="text-3xl font-bold text-primary mt-4">{strategy.avgYield}</div>
                  <p className="text-sm text-muted-foreground">Average Yield</p>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-muted-foreground">Initial Capital</div>
                      <div className="font-semibold">{strategy.capital}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Management Level</div>
                      <div className="font-semibold">{strategy.management}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Risk Level</div>
                      <div className="font-semibold">{strategy.riskLevel}</div>
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-2">
                    {Object.entries(strategy.features).map(([feature, available]) => (
                      <div key={feature} className="flex items-start gap-2">
                        {available ? (
                          <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        ) : (
                          <X className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        )}
                        <span className={available ? "text-foreground" : "text-muted-foreground"}>
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ComparisonTable;
