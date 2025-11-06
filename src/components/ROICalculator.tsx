import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, TrendingUp } from "lucide-react";
import { HelpTooltip } from "@/components/HelpTooltip";

const ROICalculator = () => {
  const [propertyPrice, setPropertyPrice] = useState<number>(300000);
  const [deposit, setDeposit] = useState<number>(60000);
  const [monthlyRent, setMonthlyRent] = useState<number>(1500);
  const [monthlyCosts, setMonthlyCosts] = useState<number>(300);

  const mortgageAmount = propertyPrice - deposit;
  const annualRent = monthlyRent * 12;
  const annualCosts = monthlyCosts * 12;
  const netAnnualIncome = annualRent - annualCosts;
  const roi = ((netAnnualIncome / deposit) * 100).toFixed(2);
  const grossYield = ((annualRent / propertyPrice) * 100).toFixed(2);

  return (
    <section className="py-20 bg-accent/30" id="calculator">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            Quick <span className="text-primary">ROI Calculator</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get instant estimates on your property investment returns
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Property Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Label htmlFor="price">Property Price (£)</Label>
                  <HelpTooltip content="The total purchase price of the property including all fees" />
                </div>
                <Input
                  id="price"
                  type="number"
                  value={propertyPrice}
                  onChange={(e) => setPropertyPrice(Number(e.target.value))}
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Label htmlFor="deposit">Deposit Amount (£)</Label>
                  <HelpTooltip content="Your upfront cash investment. Typically 20-25% of property price for buy-to-let mortgages" />
                </div>
                <Input
                  id="deposit"
                  type="number"
                  value={deposit}
                  onChange={(e) => setDeposit(Number(e.target.value))}
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Label htmlFor="rent">Monthly Rent (£)</Label>
                  <HelpTooltip content="Expected monthly rental income before expenses. Research local market rates for accurate estimates" />
                </div>
                <Input
                  id="rent"
                  type="number"
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(Number(e.target.value))}
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Label htmlFor="costs">Monthly Costs (£)</Label>
                  <HelpTooltip content="Include maintenance, insurance, management fees, and void periods. Typically 20-30% of rent" />
                </div>
                <Input
                  id="costs"
                  type="number"
                  value={monthlyCosts}
                  onChange={(e) => setMonthlyCosts(Number(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Investment Returns
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-sm text-muted-foreground">Return on Investment</div>
                  <HelpTooltip content="Annual return as a percentage of your initial deposit. Shows how efficiently your cash investment generates income" />
                </div>
              <div className="text-4xl font-bold text-primary">{roi}%</div>
              <div className="text-sm text-muted-foreground mt-1">Annual ROI</div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 roi-results">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-sm text-muted-foreground">Gross Yield</div>
                    <HelpTooltip content="Annual rent as a percentage of property price before costs. UK average is 4-6%" side="left" />
                  </div>
                  <div className="text-2xl font-bold">{grossYield}%</div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-sm text-muted-foreground">Net Annual Income</div>
                    <HelpTooltip content="Total yearly profit after deducting all operating costs and expenses" side="left" />
                  </div>
                  <div className="text-2xl font-bold">£{netAnnualIncome.toLocaleString()}</div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="text-sm text-muted-foreground mb-2">Mortgage Amount</div>
                <div className="text-xl font-semibold">£{mortgageAmount.toLocaleString()}</div>
              </div>

              <div className="p-4 bg-background rounded-lg">
                <p className="text-sm text-muted-foreground">
                  This is a simplified calculator. For detailed analysis including mortgage payments, 
                  tax implications, and market trends, create a free account.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default ROICalculator;
