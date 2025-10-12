import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, TrendingUp } from "lucide-react";

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
                <Label htmlFor="price">Property Price (£)</Label>
                <Input
                  id="price"
                  type="number"
                  value={propertyPrice}
                  onChange={(e) => setPropertyPrice(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="deposit">Deposit Amount (£)</Label>
                <Input
                  id="deposit"
                  type="number"
                  value={deposit}
                  onChange={(e) => setDeposit(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="rent">Monthly Rent (£)</Label>
                <Input
                  id="rent"
                  type="number"
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="costs">Monthly Costs (£)</Label>
                <Input
                  id="costs"
                  type="number"
                  value={monthlyCosts}
                  onChange={(e) => setMonthlyCosts(Number(e.target.value))}
                  className="mt-1"
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
                <div className="text-sm text-muted-foreground mb-1">Return on Investment</div>
                <div className="text-4xl font-bold text-primary">{roi}%</div>
                <div className="text-sm text-muted-foreground mt-1">Annual ROI</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Gross Yield</div>
                  <div className="text-2xl font-bold">{grossYield}%</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Net Annual Income</div>
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
