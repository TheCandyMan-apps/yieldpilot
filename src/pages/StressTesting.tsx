import { useState } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TrendingDown, TrendingUp, AlertTriangle, CheckCircle2, XCircle, Activity } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EntitlementGuard } from "@/components/EntitlementGuard";
import { PREMIUM_FEATURES } from "@/lib/entitlements";

interface ScenarioResult {
  name: string;
  baseline: PortfolioMetrics;
  scenario: PortfolioMetrics;
  delta: {
    totalValue: number;
    totalCashFlow: number;
    avgYield: number;
    avgROI: number;
  };
  riskFlags: Array<{ severity: string; message: string }>;
}

interface PortfolioMetrics {
  totalValue: number;
  totalRent: number;
  totalCashFlow: number;
  avgYield: number;
  avgROI: number;
  dealCount: number;
}

export default function StressTesting() {
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ScenarioResult[]>([]);
  
  const [interestRate, setInterestRate] = useState(0);
  const [rentChange, setRentChange] = useState(0);
  const [propertyValue, setPropertyValue] = useState(0);
  const [voidRate, setVoidRate] = useState(0);
  const [maintenance, setMaintenance] = useState(0);

  const predefinedScenarios = [
    {
      name: "Interest Rate Shock +2%",
      params: { interestRateChange: 2, rentChange: 0, propertyValueChange: -5, voidRateChange: 0, maintenanceChange: 0 }
    },
    {
      name: "Recession Scenario",
      params: { interestRateChange: 1.5, rentChange: -10, propertyValueChange: -15, voidRateChange: 3, maintenanceChange: 5 }
    },
    {
      name: "Market Recovery",
      params: { interestRateChange: -0.5, rentChange: 8, propertyValueChange: 12, voidRateChange: -2, maintenanceChange: 0 }
    },
    {
      name: "High Inflation",
      params: { interestRateChange: 1, rentChange: 5, propertyValueChange: 3, voidRateChange: 1, maintenanceChange: 15 }
    },
  ];

  const runScenarios = async (scenarios: typeof predefinedScenarios) => {
    if (!id || id === 'default') {
      toast.error("Please select a portfolio to stress test");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('scenario-runner', {
        body: {
          portfolio_id: id,
          scenarios,
        },
      });

      if (error) throw error;
      setResults(data.results);
      toast.success(`Analyzed ${scenarios.length} scenarios`);
    } catch (error: any) {
      console.error('Scenario error:', error);
      toast.error(error.message || 'Scenario analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const runCustomScenario = () => {
    const customScenario = [{
      name: "Custom Scenario",
      params: {
        interestRateChange: interestRate,
        rentChange,
        propertyValueChange: propertyValue,
        voidRateChange: voidRate,
        maintenanceChange: maintenance,
      },
    }];
    runScenarios(customScenario);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', { 
      style: 'currency', 
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDelta = (value: number, prefix = '£') => {
    const sign = value >= 0 ? '+' : '';
    if (prefix === '£') {
      return `${sign}${formatCurrency(Math.abs(value))}`;
    }
    return `${sign}${value.toFixed(2)}%`;
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-5 w-5 text-destructive" />;
      case 'high': return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'medium': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default: return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }
  };

  return (
    <DashboardLayout>
      <EntitlementGuard feature={PREMIUM_FEATURES.STRESS_TESTING}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Portfolio Stress Testing</h1>
          <p className="text-muted-foreground mt-2">
            Model different market scenarios and assess portfolio resilience
          </p>
        </div>

        <Tabs defaultValue="quick" className="space-y-4">
          <TabsList>
            <TabsTrigger value="quick">Quick Scenarios</TabsTrigger>
            <TabsTrigger value="custom">Custom Scenario</TabsTrigger>
          </TabsList>

          <TabsContent value="quick">
            <Card>
              <CardHeader>
                <CardTitle>Predefined Scenarios</CardTitle>
                <CardDescription>
                  Run common market scenarios to stress test your portfolio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {predefinedScenarios.map((scenario) => (
                    <Card key={scenario.name} className="border-2 hover:border-primary/50 transition-colors">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{scenario.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Interest Rate:</span>
                            <span className="font-medium ml-2">{scenario.params.interestRateChange > 0 ? '+' : ''}{scenario.params.interestRateChange}%</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Rent:</span>
                            <span className="font-medium ml-2">{scenario.params.rentChange > 0 ? '+' : ''}{scenario.params.rentChange}%</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Property Value:</span>
                            <span className="font-medium ml-2">{scenario.params.propertyValueChange > 0 ? '+' : ''}{scenario.params.propertyValueChange}%</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Voids:</span>
                            <span className="font-medium ml-2">{scenario.params.voidRateChange > 0 ? '+' : ''}{scenario.params.voidRateChange}%</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Button 
                  onClick={() => runScenarios(predefinedScenarios)} 
                  disabled={loading}
                  size="lg"
                  className="w-full"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  {loading ? 'Running Analysis...' : 'Run All Scenarios'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="custom">
            <Card>
              <CardHeader>
                <CardTitle>Custom Stress Test</CardTitle>
                <CardDescription>
                  Adjust parameters to create your own scenario
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium">Interest Rate Change</label>
                      <span className="text-sm font-bold">{interestRate > 0 ? '+' : ''}{interestRate}%</span>
                    </div>
                    <Slider
                      value={[interestRate]}
                      onValueChange={(v) => setInterestRate(v[0])}
                      min={-2}
                      max={5}
                      step={0.25}
                      className="py-4"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium">Rent Change</label>
                      <span className="text-sm font-bold">{rentChange > 0 ? '+' : ''}{rentChange}%</span>
                    </div>
                    <Slider
                      value={[rentChange]}
                      onValueChange={(v) => setRentChange(v[0])}
                      min={-20}
                      max={20}
                      step={1}
                      className="py-4"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium">Property Value Change</label>
                      <span className="text-sm font-bold">{propertyValue > 0 ? '+' : ''}{propertyValue}%</span>
                    </div>
                    <Slider
                      value={[propertyValue]}
                      onValueChange={(v) => setPropertyValue(v[0])}
                      min={-30}
                      max={30}
                      step={1}
                      className="py-4"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium">Void Rate Change</label>
                      <span className="text-sm font-bold">{voidRate > 0 ? '+' : ''}{voidRate}%</span>
                    </div>
                    <Slider
                      value={[voidRate]}
                      onValueChange={(v) => setVoidRate(v[0])}
                      min={-5}
                      max={10}
                      step={0.5}
                      className="py-4"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium">Maintenance Cost Change</label>
                      <span className="text-sm font-bold">{maintenance > 0 ? '+' : ''}{maintenance}%</span>
                    </div>
                    <Slider
                      value={[maintenance]}
                      onValueChange={(v) => setMaintenance(v[0])}
                      min={-10}
                      max={30}
                      step={1}
                      className="py-4"
                    />
                  </div>
                </div>

                <Button onClick={runCustomScenario} disabled={loading} size="lg" className="w-full">
                  {loading ? 'Analyzing...' : 'Run Custom Scenario'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Scenario Results</CardTitle>
              <CardDescription>Portfolio impact analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {results.map((result, idx) => (
                <div key={idx} className="space-y-4 pb-6 border-b last:border-b-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{result.name}</h3>
                    {result.riskFlags.length > 0 && (
                      <Badge variant="destructive">
                        {result.riskFlags.length} Risk{result.riskFlags.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>

                  <div className="grid md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-sm text-muted-foreground mb-1">Total Value</div>
                        <div className="text-xl font-bold">{formatCurrency(result.scenario.totalValue)}</div>
                        <div className={`text-sm flex items-center gap-1 mt-1 ${result.delta.totalValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {result.delta.totalValue >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {formatDelta(result.delta.totalValue)}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-sm text-muted-foreground mb-1">Annual Cash Flow</div>
                        <div className="text-xl font-bold">{formatCurrency(result.scenario.totalCashFlow)}</div>
                        <div className={`text-sm flex items-center gap-1 mt-1 ${result.delta.totalCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {result.delta.totalCashFlow >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {formatDelta(result.delta.totalCashFlow)}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-sm text-muted-foreground mb-1">Avg Yield</div>
                        <div className="text-xl font-bold">{result.scenario.avgYield.toFixed(2)}%</div>
                        <div className={`text-sm flex items-center gap-1 mt-1 ${result.delta.avgYield >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {result.delta.avgYield >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {formatDelta(result.delta.avgYield, '%')}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-sm text-muted-foreground mb-1">Avg ROI</div>
                        <div className="text-xl font-bold">{result.scenario.avgROI.toFixed(2)}%</div>
                        <div className={`text-sm flex items-center gap-1 mt-1 ${result.delta.avgROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {result.delta.avgROI >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {formatDelta(result.delta.avgROI, '%')}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {result.riskFlags.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Risk Flags</h4>
                      {result.riskFlags.map((flag, flagIdx) => (
                        <div key={flagIdx} className="flex items-start gap-2 p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                          {getSeverityIcon(flag.severity)}
                          <div className="flex-1">
                            <p className="font-medium capitalize">{flag.severity} Risk</p>
                            <p className="text-sm text-muted-foreground">{flag.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
            </Card>
          )}
        </div>
      </EntitlementGuard>
    </DashboardLayout>
  );
}
