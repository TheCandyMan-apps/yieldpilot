import { useState, useEffect } from "react";
import { Calculator, Download, FileSpreadsheet, FileText, Zap, Save, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from 'xlsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Checkbox } from "@/components/ui/checkbox";
import { getEPCAdvice, runStrategySimulation } from "@/lib/sdk/adjusted";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UnderwriteDrawerProps {
  deal: {
    id: string;
    property_address: string;
    price: number;
    estimated_rent?: number;
    bedrooms?: number;
    city?: string;
    country?: string;
    epc_rating?: string;
  };
  trigger?: React.ReactNode;
}

interface UnderwriteInputs {
  financeType: 'io' | 'amort';
  ltv: number;
  rate: number;
  fees: number;
  capexYear1: number;
  capexYear2: number;
  capexYear3: number;
  monthlyRent: number;
  opexPct: number;
  vacancyPct: number;
  exitYear: number;
  appreciationRate: number;
}

interface CashflowRow {
  year: number;
  rent: number;
  opex: number;
  mortgage: number;
  capex: number;
  netCashflow: number;
  cumulativeCashflow: number;
  propertyValue: number;
}

export function UnderwriteDrawer({ deal, trigger }: UnderwriteDrawerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState<UnderwriteInputs>({
    financeType: 'io',
    ltv: 75,
    rate: 5.5,
    fees: 2000,
    capexYear1: 5000,
    capexYear2: 0,
    capexYear3: 0,
    monthlyRent: deal.estimated_rent || 0,
    opexPct: 15,
    vacancyPct: 5,
    exitYear: 10,
    appreciationRate: 3,
  });

  // Regulation & Tax state
  const [regulationSettings, setRegulationSettings] = useState({
    country: deal.country || 'UK',
    taxYear: 2025,
    personalTaxBand: 'higher', // 'basic' | 'higher' | 'additional' | 'defaults'
    applySection24: true,
    includeEPCRetrofit: true,
    includeLicensing: false,
  });

  const [selectedStrategy, setSelectedStrategy] = useState<string>('LTR');
  const [epcAdvice, setEpcAdvice] = useState<any>(null);
  const [strategySimResults, setStrategySimResults] = useState<any>(null);

  const [results, setResults] = useState<{
    cashflows: CashflowRow[];
    dscr: number;
    breakeven: number;
    irr: number;
    equityMultiple: number;
  } | null>(null);

  // Load strategy presets when strategy changes
  useEffect(() => {
    const applyStrategyPreset = async () => {
      const presets: Record<string, Partial<UnderwriteInputs>> = {
        LTR: { opexPct: 15, vacancyPct: 5, ltv: 75 },
        HMO: { opexPct: 25, vacancyPct: 8, ltv: 70, capexYear1: 15000 },
        STR: { opexPct: 30, vacancyPct: 15, ltv: 65 },
        BRRR: { ltv: 75, capexYear1: 25000, appreciationRate: 5, exitYear: 3 },
      };
      
      if (presets[selectedStrategy]) {
        setInputs(prev => ({ ...prev, ...presets[selectedStrategy] }));
        if (selectedStrategy === 'HMO') {
          setRegulationSettings(prev => ({ ...prev, includeLicensing: true }));
        }
      }
    };
    
    applyStrategyPreset();
  }, [selectedStrategy]);

  const calculateMetrics = () => {
    const loanAmount = deal.price * (inputs.ltv / 100);
    const equity = deal.price - loanAmount;
    const monthlyRate = inputs.rate / 100 / 12;
    const periods = inputs.exitYear * 12;

    let monthlyPayment: number;
    if (inputs.financeType === 'io') {
      monthlyPayment = loanAmount * monthlyRate;
    } else {
      monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, periods)) / (Math.pow(1 + monthlyRate, periods) - 1);
    }

    const cashflows: CashflowRow[] = [];
    let cumulativeCashflow = -(equity + inputs.fees);

    for (let year = 1; year <= inputs.exitYear; year++) {
      const annualRent = inputs.monthlyRent * 12 * (1 - inputs.vacancyPct / 100);
      const opex = annualRent * (inputs.opexPct / 100);
      const mortgage = monthlyPayment * 12;
      const capex = year === 1 ? inputs.capexYear1 : year === 2 ? inputs.capexYear2 : year === 3 ? inputs.capexYear3 : 0;
      const netCashflow = annualRent - opex - mortgage - capex;
      cumulativeCashflow += netCashflow;
      const propertyValue = deal.price * Math.pow(1 + inputs.appreciationRate / 100, year);

      cashflows.push({
        year,
        rent: annualRent,
        opex,
        mortgage,
        capex,
        netCashflow,
        cumulativeCashflow,
        propertyValue,
      });
    }

    // Add exit proceeds
    const finalValue = cashflows[cashflows.length - 1].propertyValue;
    const saleProceeds = finalValue - loanAmount;
    cumulativeCashflow += saleProceeds;

    // Calculate DSCR (first year)
    const noi = cashflows[0].rent - cashflows[0].opex;
    const dscr = noi / cashflows[0].mortgage;

    // Breakeven occupancy
    const breakeven = ((cashflows[0].opex + cashflows[0].mortgage) / cashflows[0].rent) * 100 / (1 - inputs.vacancyPct / 100);

    // IRR calculation (simplified Newton-Raphson)
    const irr = calculateIRR([-equity - inputs.fees, ...cashflows.map(cf => cf.netCashflow)], saleProceeds);

    // Equity multiple
    const equityMultiple = cumulativeCashflow / (equity + inputs.fees);

    setResults({
      cashflows,
      dscr,
      breakeven,
      irr,
      equityMultiple,
    });
  };

  const calculateIRR = (cashflows: number[], exitProceeds: number): number => {
    const allCashflows = [...cashflows];
    allCashflows[allCashflows.length - 1] += exitProceeds;
    
    let rate = 0.1;
    for (let i = 0; i < 20; i++) {
      let npv = 0;
      let dnpv = 0;
      for (let j = 0; j < allCashflows.length; j++) {
        npv += allCashflows[j] / Math.pow(1 + rate, j);
        dnpv += -j * allCashflows[j] / Math.pow(1 + rate, j + 1);
      }
      const newRate = rate - npv / dnpv;
      if (Math.abs(newRate - rate) < 0.0001) {
        return newRate * 100;
      }
      rate = newRate;
    }
    return rate * 100;
  };

  const exportToPDF = async () => {
    if (!results) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-report-pdf', {
        body: {
          deal,
          inputs,
          results,
        },
      });

      if (error) throw error;

      toast({
        title: "Export initiated",
        description: "Your PDF will download shortly",
      });

      // Track usage
      await supabase.from('metered_usage').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        resource_type: 'export',
        quantity: 1,
        metadata: { format: 'pdf', deal_id: deal.id },
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!results) return;

    const ws = XLSX.utils.json_to_sheet(results.cashflows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cashflows");

    const summaryData = [
      ["Property Address", deal.property_address],
      ["Purchase Price", deal.price],
      ["LTV", `${inputs.ltv}%`],
      ["Interest Rate", `${inputs.rate}%`],
      ["DSCR", results.dscr.toFixed(2)],
      ["Breakeven Occupancy", `${results.breakeven.toFixed(1)}%`],
      ["IRR", `${results.irr.toFixed(2)}%`],
      ["Equity Multiple", `${results.equityMultiple.toFixed(2)}x`],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    XLSX.writeFile(wb, `${deal.property_address.replace(/[^a-z0-9]/gi, '_')}_underwriting.xlsx`);

    toast({
      title: "Excel exported",
      description: "Your underwriting analysis has been downloaded",
    });
  };

  const handleEPCAdvisor = async () => {
    setLoading(true);
    try {
      const advice = await getEPCAdvice(deal.id, 'C');
      setEpcAdvice(advice);
      toast({
        title: "EPC Analysis Complete",
        description: `Retrofit to EPC C: £${advice.cost_estimate_min.toLocaleString()} - £${advice.cost_estimate_max.toLocaleString()}`,
      });
    } catch (error: any) {
      toast({
        title: "EPC Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRunStrategy = async () => {
    setLoading(true);
    try {
      const simResults = await runStrategySimulation(deal.id, selectedStrategy, {
        ltv: inputs.ltv,
        licensing_monthly: regulationSettings.includeLicensing ? 150 : 0,
      });
      setStrategySimResults(simResults);
      toast({
        title: "Strategy Simulation Complete",
        description: `${selectedStrategy}: ${simResults.projection_10yr.length} year projection ready`,
      });
    } catch (error: any) {
      toast({
        title: "Simulation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveScenario = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Must be logged in");

      // Workaround for type generation - cast to any temporarily
      const { error } = await (supabase.from('user_scenarios') as any).insert({
        user_id: user.id,
        listing_id: deal.id,
        strategy_key: selectedStrategy,
        params: {
          inputs,
          regulationSettings,
          results,
          epcAdvice,
          strategySimResults,
        },
      });

      if (error) throw error;

      toast({
        title: "Scenario Saved",
        description: "You can review this later in your saved scenarios",
      });
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Calculator className="h-4 w-4 mr-2" />
            Underwrite
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Underwriting Analysis</SheetTitle>
          <SheetDescription>
            {deal.property_address}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="inputs" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="inputs">Inputs</TabsTrigger>
            <TabsTrigger value="regulation">Regulation</TabsTrigger>
            <TabsTrigger value="outputs" disabled={!results}>Outputs</TabsTrigger>
            <TabsTrigger value="cashflow" disabled={!results}>Cashflow</TabsTrigger>
          </TabsList>

          <TabsContent value="inputs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Strategy</CardTitle>
                <CardDescription>Select investment approach</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LTR">LTR - Long Term Rental</SelectItem>
                    <SelectItem value="HMO">HMO - House in Multiple Occupation</SelectItem>
                    <SelectItem value="STR">STR - Short Term Rental</SelectItem>
                    <SelectItem value="BRRR">BRRR - Buy-Refurb-Rent-Refinance</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleRunStrategy} disabled={loading} className="w-full mt-3" variant="outline">
                  <Zap className="h-4 w-4 mr-2" />
                  Run Strategy Simulation
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Finance Type</Label>
                    <Select value={inputs.financeType} onValueChange={(value: 'io' | 'amort') => setInputs({ ...inputs, financeType: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="io">Interest Only</SelectItem>
                        <SelectItem value="amort">Amortizing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>LTV %</Label>
                    <Input type="number" value={inputs.ltv} onChange={(e) => setInputs({ ...inputs, ltv: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Interest Rate %</Label>
                    <Input type="number" step="0.1" value={inputs.rate} onChange={(e) => setInputs({ ...inputs, rate: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Closing Fees</Label>
                    <Input type="number" value={inputs.fees} onChange={(e) => setInputs({ ...inputs, fees: Number(e.target.value) })} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Operating Assumptions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Monthly Rent</Label>
                    <Input type="number" value={inputs.monthlyRent} onChange={(e) => setInputs({ ...inputs, monthlyRent: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Opex %</Label>
                    <Input type="number" value={inputs.opexPct} onChange={(e) => setInputs({ ...inputs, opexPct: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Vacancy %</Label>
                    <Input type="number" value={inputs.vacancyPct} onChange={(e) => setInputs({ ...inputs, vacancyPct: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Exit Year</Label>
                    <Input type="number" value={inputs.exitYear} onChange={(e) => setInputs({ ...inputs, exitYear: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Appreciation Rate %</Label>
                    <Input type="number" step="0.1" value={inputs.appreciationRate} onChange={(e) => setInputs({ ...inputs, appreciationRate: Number(e.target.value) })} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Capex Schedule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Year 1</Label>
                    <Input type="number" value={inputs.capexYear1} onChange={(e) => setInputs({ ...inputs, capexYear1: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Year 2</Label>
                    <Input type="number" value={inputs.capexYear2} onChange={(e) => setInputs({ ...inputs, capexYear2: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Year 3</Label>
                    <Input type="number" value={inputs.capexYear3} onChange={(e) => setInputs({ ...inputs, capexYear3: Number(e.target.value) })} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button onClick={calculateMetrics} className="w-full">
              <Calculator className="h-4 w-4 mr-2" />
              Calculate Metrics
            </Button>
          </TabsContent>

          <TabsContent value="regulation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Regulation & Tax</CardTitle>
                <CardDescription>Apply country-specific tax rules and compliance costs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Country</Label>
                    <Input value={regulationSettings.country} disabled className="bg-muted" />
                  </div>
                  <div>
                    <Label>Tax Year</Label>
                    <Select 
                      value={String(regulationSettings.taxYear)} 
                      onValueChange={(val) => setRegulationSettings({...regulationSettings, taxYear: Number(val)})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2026">2026</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Personal Tax Band</Label>
                    <Select 
                      value={regulationSettings.personalTaxBand} 
                      onValueChange={(val: any) => setRegulationSettings({...regulationSettings, personalTaxBand: val})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="defaults">Use Country Defaults</SelectItem>
                        <SelectItem value="basic">Basic Rate (20%)</SelectItem>
                        <SelectItem value="higher">Higher Rate (40%)</SelectItem>
                        <SelectItem value="additional">Additional Rate (45%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="section24" 
                      checked={regulationSettings.applySection24}
                      onCheckedChange={(checked) => setRegulationSettings({...regulationSettings, applySection24: checked as boolean})}
                    />
                    <Label htmlFor="section24" className="text-sm cursor-pointer">
                      Apply Section 24 rules (UK: no mortgage interest deduction, 20% tax credit)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="epc" 
                      checked={regulationSettings.includeEPCRetrofit}
                      onCheckedChange={(checked) => setRegulationSettings({...regulationSettings, includeEPCRetrofit: checked as boolean})}
                    />
                    <Label htmlFor="epc" className="text-sm cursor-pointer">
                      Include EPC retrofit costs to minimum standard (C)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="licensing" 
                      checked={regulationSettings.includeLicensing}
                      onCheckedChange={(checked) => setRegulationSettings({...regulationSettings, includeLicensing: checked as boolean})}
                    />
                    <Label htmlFor="licensing" className="text-sm cursor-pointer">
                      Include licensing/compliance costs where applicable
                    </Label>
                  </div>
                </div>

                {regulationSettings.applySection24 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Section 24: Higher-rate taxpayers are significantly impacted. 
                      Adjusted yield will be lower than gross yield.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>EPC Retrofit Advisor</CardTitle>
                <CardDescription>
                  {deal.epc_rating ? `Current: EPC ${deal.epc_rating}` : 'EPC rating unknown'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={handleEPCAdvisor} disabled={loading} className="w-full" variant="outline">
                  <Zap className="h-4 w-4 mr-2" />
                  Get EPC Upgrade Recommendations
                </Button>

                {epcAdvice && (
                  <div className="space-y-2 p-3 bg-muted rounded-lg text-sm">
                    <div className="flex justify-between">
                      <span>Cost Range:</span>
                      <span className="font-semibold">
                        £{epcAdvice.cost_estimate_min.toLocaleString()} - £{epcAdvice.cost_estimate_max.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Amortized (7yr):</span>
                      <span className="font-semibold">
                        £{((epcAdvice.cost_estimate_min + epcAdvice.cost_estimate_max) / 2 / 7 / 12).toFixed(0)}/mo
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Expected Yield Uplift:</span>
                      <span className="font-semibold text-green-600">+{epcAdvice.expected_yield_uplift || 0.3}%</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button onClick={handleSaveScenario} disabled={loading || !results} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Save as Scenario
            </Button>
          </TabsContent>

          <TabsContent value="outputs" className="space-y-4">
            {results && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>DSCR</CardTitle>
                      <CardDescription>Debt Service Coverage Ratio</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{results.dscr.toFixed(2)}x</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {results.dscr >= 1.25 ? "✓ Strong coverage" : "⚠️ Below threshold"}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Breakeven</CardTitle>
                      <CardDescription>Occupancy Required</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{results.breakeven.toFixed(1)}%</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {results.breakeven <= 85 ? "✓ Low risk" : "⚠️ High risk"}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>IRR</CardTitle>
                      <CardDescription>Internal Rate of Return</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{results.irr.toFixed(2)}%</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {results.irr >= 15 ? "✓ Excellent" : results.irr >= 10 ? "Good" : "Below target"}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Equity Multiple</CardTitle>
                      <CardDescription>Return on Equity</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{results.equityMultiple.toFixed(2)}x</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {results.equityMultiple >= 2 ? "✓ Strong return" : "Moderate"}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex gap-2">
                  <Button onClick={exportToPDF} disabled={loading} className="flex-1">
                    <FileText className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                  <Button onClick={exportToExcel} variant="outline" className="flex-1">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export Excel
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="cashflow" className="space-y-4">
            {results && (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={results.cashflows}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" label={{ value: 'Year', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'Amount ($)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="netCashflow" stroke="#00B2A9" name="Net Cashflow" />
                    <Line type="monotone" dataKey="cumulativeCashflow" stroke="#8884d8" name="Cumulative" />
                  </LineChart>
                </ResponsiveContainer>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left">Year</th>
                        <th className="p-2 text-right">Rent</th>
                        <th className="p-2 text-right">Opex</th>
                        <th className="p-2 text-right">Mortgage</th>
                        <th className="p-2 text-right">Capex</th>
                        <th className="p-2 text-right">Net CF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.cashflows.map((row) => (
                        <tr key={row.year} className="border-t">
                          <td className="p-2">{row.year}</td>
                          <td className="p-2 text-right">${row.rent.toLocaleString()}</td>
                          <td className="p-2 text-right">${row.opex.toLocaleString()}</td>
                          <td className="p-2 text-right">${row.mortgage.toLocaleString()}</td>
                          <td className="p-2 text-right">${row.capex.toLocaleString()}</td>
                          <td className={`p-2 text-right font-medium ${row.netCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${row.netCashflow.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}