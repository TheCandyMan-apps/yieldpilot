import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface SimulatorValues {
  propertyPrice: number;
  deposit: number;
  interestRate: number;
  monthlyRent: number;
  monthlyExpenses: number;
  refurbCost: number;
}

interface Scenario {
  name: string;
  values: SimulatorValues;
}

const Simulator = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Base scenario
  const [values, setValues] = useState<SimulatorValues>({
    propertyPrice: 200000,
    deposit: 25, // percentage
    interestRate: 5.5,
    monthlyRent: 1200,
    monthlyExpenses: 300,
    refurbCost: 0,
  });

  // Scenarios
  const [scenarios, setScenarios] = useState<Scenario[]>([
    {
      name: "Base",
      values: { ...values },
    },
  ]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setLoading(false);
  };

  // Calculations
  const loanAmount = values.propertyPrice * (1 - values.deposit / 100);
  const depositAmount = values.propertyPrice * (values.deposit / 100);
  const monthlyMortgage = calculateMortgage(loanAmount, values.interestRate, 25);
  const monthlyCashFlow = values.monthlyRent - monthlyMortgage - values.monthlyExpenses;
  const annualCashFlow = monthlyCashFlow * 12;
  const totalInvestment = depositAmount + values.refurbCost;
  const grossYield = ((values.monthlyRent * 12) / values.propertyPrice) * 100;
  const netYield = ((annualCashFlow) / totalInvestment) * 100;
  const roi = (annualCashFlow / totalInvestment) * 100;

  function calculateMortgage(principal: number, annualRate: number, years: number): number {
    const monthlyRate = annualRate / 100 / 12;
    const numPayments = years * 12;
    return (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
      (Math.pow(1 + monthlyRate, numPayments) - 1);
  }

  const handleValueChange = (key: keyof SimulatorValues, value: number) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const addScenario = (type: "optimistic" | "pessimistic") => {
    const newValues = { ...values };
    
    if (type === "optimistic") {
      newValues.monthlyRent = values.monthlyRent * 1.1;
      newValues.interestRate = values.interestRate * 0.9;
      newValues.monthlyExpenses = values.monthlyExpenses * 0.9;
    } else {
      newValues.monthlyRent = values.monthlyRent * 0.9;
      newValues.interestRate = values.interestRate * 1.15;
      newValues.monthlyExpenses = values.monthlyExpenses * 1.15;
    }

    const scenarioName = type.charAt(0).toUpperCase() + type.slice(1);
    
    setScenarios((prev) => {
      // Remove existing scenario of this type
      const filtered = prev.filter((s) => s.name !== scenarioName);
      return [...filtered, { name: scenarioName, values: newValues }];
    });

    toast.success(`${scenarioName} scenario added`);
  };

  const resetScenarios = () => {
    setScenarios([{ name: "Base", values: { ...values } }]);
    toast.success("Scenarios reset");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Investment Simulator</h1>
            <p className="text-muted-foreground mt-1">
              Model different scenarios and see how they affect your returns
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetScenarios}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Input Sliders */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Property Details</CardTitle>
                <CardDescription>Adjust the sliders to model your investment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Property Price */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Property Price</Label>
                    <Input
                      type="number"
                      value={values.propertyPrice}
                      onChange={(e) => handleValueChange("propertyPrice", Number(e.target.value))}
                      className="w-32 text-right"
                    />
                  </div>
                  <Slider
                    value={[values.propertyPrice]}
                    onValueChange={([val]) => handleValueChange("propertyPrice", val)}
                    min={50000}
                    max={1000000}
                    step={10000}
                  />
                </div>

                {/* Deposit % */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Deposit (%)</Label>
                    <Input
                      type="number"
                      value={values.deposit}
                      onChange={(e) => handleValueChange("deposit", Number(e.target.value))}
                      className="w-32 text-right"
                    />
                  </div>
                  <Slider
                    value={[values.deposit]}
                    onValueChange={([val]) => handleValueChange("deposit", val)}
                    min={5}
                    max={50}
                    step={1}
                  />
                </div>

                {/* Interest Rate */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Interest Rate (%)</Label>
                    <Input
                      type="number"
                      value={values.interestRate}
                      onChange={(e) => handleValueChange("interestRate", Number(e.target.value))}
                      className="w-32 text-right"
                      step="0.1"
                    />
                  </div>
                  <Slider
                    value={[values.interestRate]}
                    onValueChange={([val]) => handleValueChange("interestRate", val)}
                    min={1}
                    max={10}
                    step={0.1}
                  />
                </div>

                {/* Monthly Rent */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Monthly Rent</Label>
                    <Input
                      type="number"
                      value={values.monthlyRent}
                      onChange={(e) => handleValueChange("monthlyRent", Number(e.target.value))}
                      className="w-32 text-right"
                    />
                  </div>
                  <Slider
                    value={[values.monthlyRent]}
                    onValueChange={([val]) => handleValueChange("monthlyRent", val)}
                    min={200}
                    max={5000}
                    step={50}
                  />
                </div>

                {/* Monthly Expenses */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Monthly Expenses</Label>
                    <Input
                      type="number"
                      value={values.monthlyExpenses}
                      onChange={(e) => handleValueChange("monthlyExpenses", Number(e.target.value))}
                      className="w-32 text-right"
                    />
                  </div>
                  <Slider
                    value={[values.monthlyExpenses]}
                    onValueChange={([val]) => handleValueChange("monthlyExpenses", val)}
                    min={0}
                    max={1000}
                    step={25}
                  />
                </div>

                {/* Refurb Cost */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Refurbishment Cost</Label>
                    <Input
                      type="number"
                      value={values.refurbCost}
                      onChange={(e) => handleValueChange("refurbCost", Number(e.target.value))}
                      className="w-32 text-right"
                    />
                  </div>
                  <Slider
                    value={[values.refurbCost]}
                    onValueChange={([val]) => handleValueChange("refurbCost", val)}
                    min={0}
                    max={100000}
                    step={1000}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Scenario Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Compare Scenarios</CardTitle>
                <CardDescription>Add optimistic and pessimistic scenarios</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Button onClick={() => addScenario("optimistic")} variant="outline">
                    Add Optimistic
                  </Button>
                  <Button onClick={() => addScenario("pessimistic")} variant="outline">
                    Add Pessimistic
                  </Button>
                </div>

                <Tabs defaultValue="Base">
                  <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${scenarios.length}, 1fr)` }}>
                    {scenarios.map((scenario) => (
                      <TabsTrigger key={scenario.name} value={scenario.name}>
                        {scenario.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {scenarios.map((scenario) => {
                    const scLoan = scenario.values.propertyPrice * (1 - scenario.values.deposit / 100);
                    const scDeposit = scenario.values.propertyPrice * (scenario.values.deposit / 100);
                    const scMortgage = calculateMortgage(scLoan, scenario.values.interestRate, 25);
                    const scCashFlow = scenario.values.monthlyRent - scMortgage - scenario.values.monthlyExpenses;
                    const scAnnualCF = scCashFlow * 12;
                    const scTotalInv = scDeposit + scenario.values.refurbCost;
                    const scROI = (scAnnualCF / scTotalInv) * 100;
                    const scYield = ((scenario.values.monthlyRent * 12) / scenario.values.propertyPrice) * 100;

                    return (
                      <TabsContent key={scenario.name} value={scenario.name} className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-muted p-3 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Monthly Cash Flow</p>
                            <p className={`text-lg font-bold ${scCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {formatCurrency(scCashFlow)}
                            </p>
                          </div>
                          <div className="bg-muted p-3 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Gross Yield</p>
                            <p className="text-lg font-bold">{scYield.toFixed(2)}%</p>
                          </div>
                          <div className="bg-muted p-3 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">ROI</p>
                            <p className="text-lg font-bold">{scROI.toFixed(2)}%</p>
                          </div>
                          <div className="bg-muted p-3 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Annual Cash Flow</p>
                            <p className={`text-lg font-bold ${scAnnualCF >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {formatCurrency(scAnnualCF)}
                            </p>
                          </div>
                        </div>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right: Results */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Key Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Deposit Required</p>
                  <p className="text-2xl font-bold">{formatCurrency(depositAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Loan Amount</p>
                  <p className="text-2xl font-bold">{formatCurrency(loanAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Monthly Mortgage</p>
                  <p className="text-2xl font-bold">{formatCurrency(monthlyMortgage)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Returns</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Monthly Cash Flow</p>
                  <p className={`text-3xl font-bold ${monthlyCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(monthlyCashFlow)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Gross Yield</p>
                  <p className="text-2xl font-bold">{grossYield.toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Net Yield</p>
                  <p className="text-2xl font-bold">{netYield.toFixed(2)}%</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">ROI</p>
                  <p className="text-3xl font-bold text-blue-600">{roi.toFixed(2)}%</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Total Investment</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{formatCurrency(totalInvestment)}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Deposit + Refurb Costs
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Simulator;
