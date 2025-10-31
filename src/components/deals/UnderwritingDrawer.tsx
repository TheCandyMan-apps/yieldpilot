import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UnderwritingDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: any;
}

export function UnderwritingDrawer({ open, onOpenChange, listing }: UnderwritingDrawerProps) {
  const [assumptions, setAssumptions] = useState({
    purchasePrice: listing?.price || 0,
    downPaymentPct: 25,
    interestRate: 5.5,
    loanTermYears: 30,
    closingCostsPct: 2,
    monthlyRent: listing?.estimated_rent || 0,
    vacancyPct: 5,
    managementPct: 10,
    maintenancePct: 8,
    insurance: 1200,
    propertyTax: 2400,
    annualAppreciation: 3,
    exitYears: 10,
  });

  const [metrics, setMetrics] = useState<any>(null);

  const calculateMetrics = () => {
    const loanAmount = assumptions.purchasePrice * (1 - assumptions.downPaymentPct / 100);
    const monthlyRate = assumptions.interestRate / 100 / 12;
    const numPayments = assumptions.loanTermYears * 12;
    const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
    
    const grossMonthlyIncome = assumptions.monthlyRent;
    const effectiveIncome = grossMonthlyIncome * (1 - assumptions.vacancyPct / 100);
    const monthlyOpex = (assumptions.insurance + assumptions.propertyTax) / 12 + 
                       (effectiveIncome * (assumptions.managementPct + assumptions.maintenancePct) / 100);
    const noi = (effectiveIncome - monthlyOpex) * 12;
    const cashFlow = effectiveIncome - monthlyOpex - monthlyPayment;
    const annualCashFlow = cashFlow * 12;
    
    const totalInvestment = assumptions.purchasePrice * (assumptions.downPaymentPct / 100) + 
                           assumptions.purchasePrice * (assumptions.closingCostsPct / 100);
    
    const dscr = noi / (monthlyPayment * 12);
    const coc = (annualCashFlow / totalInvestment) * 100;
    
    // 10-year projection
    const projection = [];
    let cumulativeCashFlow = 0;
    let propertyValue = assumptions.purchasePrice;
    
    for (let year = 1; year <= assumptions.exitYears; year++) {
      cumulativeCashFlow += annualCashFlow;
      propertyValue *= (1 + assumptions.annualAppreciation / 100);
      const equity = propertyValue - (loanAmount * Math.pow(1 - 1/assumptions.loanTermYears, year));
      
      projection.push({
        year,
        cashFlow: annualCashFlow,
        cumulativeCashFlow,
        propertyValue: Math.round(propertyValue),
        equity: Math.round(equity),
      });
    }
    
    // IRR calculation (simplified NPV-based)
    const exitValue = propertyValue - loanAmount;
    const totalReturn = cumulativeCashFlow + exitValue - totalInvestment;
    const irr = (Math.pow(totalReturn / totalInvestment + 1, 1 / assumptions.exitYears) - 1) * 100;
    
    setMetrics({
      monthlyPayment,
      noi,
      cashFlow,
      annualCashFlow,
      dscr,
      coc,
      irr,
      totalInvestment,
      projection,
    });
  };

  const exportPDF = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to export');
        return;
      }

      const response = await supabase.functions.invoke('generate-report-pdf', {
        body: {
          listingId: listing.id,
          assumptions,
          metrics,
          type: 'underwriting',
        },
      });

      if (response.error) throw response.error;
      
      // Track usage
      await supabase.from('metered_usage').insert({
        user_id: session.user.id,
        resource_type: 'export',
        quantity: 1,
        metadata: { format: 'pdf', type: 'underwriting' },
      });

      toast.success('PDF exported successfully');
      window.open(response.data.url, '_blank');
    } catch (error: any) {
      toast.error(error.message || 'Export failed');
    }
  };

  const exportExcel = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to export');
        return;
      }

      const response = await supabase.functions.invoke('export-pack', {
        body: {
          listingId: listing.id,
          assumptions,
          metrics,
          format: 'xlsx',
        },
      });

      if (response.error) throw response.error;

      await supabase.from('metered_usage').insert({
        user_id: session.user.id,
        resource_type: 'export',
        quantity: 1,
        metadata: { format: 'xlsx', type: 'underwriting' },
      });

      toast.success('Excel exported successfully');
      window.open(response.data.url, '_blank');
    } catch (error: any) {
      toast.error(error.message || 'Export failed');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Underwriting Analysis</SheetTitle>
          <SheetDescription>
            {listing?.property_address || 'Property Address'}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="assumptions" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="assumptions">Assumptions</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="projection">10-Yr Projection</TabsTrigger>
          </TabsList>

          <TabsContent value="assumptions" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Purchase Price</Label>
                <Input
                  type="number"
                  value={assumptions.purchasePrice}
                  onChange={(e) => setAssumptions({...assumptions, purchasePrice: Number(e.target.value)})}
                />
              </div>
              <div>
                <Label>Down Payment %</Label>
                <Input
                  type="number"
                  value={assumptions.downPaymentPct}
                  onChange={(e) => setAssumptions({...assumptions, downPaymentPct: Number(e.target.value)})}
                />
              </div>
              <div>
                <Label>Interest Rate %</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={assumptions.interestRate}
                  onChange={(e) => setAssumptions({...assumptions, interestRate: Number(e.target.value)})}
                />
              </div>
              <div>
                <Label>Loan Term (Years)</Label>
                <Input
                  type="number"
                  value={assumptions.loanTermYears}
                  onChange={(e) => setAssumptions({...assumptions, loanTermYears: Number(e.target.value)})}
                />
              </div>
              <div>
                <Label>Monthly Rent</Label>
                <Input
                  type="number"
                  value={assumptions.monthlyRent}
                  onChange={(e) => setAssumptions({...assumptions, monthlyRent: Number(e.target.value)})}
                />
              </div>
              <div>
                <Label>Vacancy %</Label>
                <Input
                  type="number"
                  value={assumptions.vacancyPct}
                  onChange={(e) => setAssumptions({...assumptions, vacancyPct: Number(e.target.value)})}
                />
              </div>
            </div>
            <Button onClick={calculateMetrics} className="w-full">Calculate Metrics</Button>
          </TabsContent>

          <TabsContent value="metrics">
            {metrics ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Key Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between"><span>DSCR:</span><strong>{metrics.dscr.toFixed(2)}</strong></div>
                    <div className="flex justify-between"><span>Cash-on-Cash:</span><strong>{metrics.coc.toFixed(2)}%</strong></div>
                    <div className="flex justify-between"><span>IRR ({assumptions.exitYears}yr):</span><strong>{metrics.irr.toFixed(2)}%</strong></div>
                    <div className="flex justify-between"><span>Monthly Cash Flow:</span><strong>${metrics.cashFlow.toFixed(0)}</strong></div>
                    <div className="flex justify-between"><span>Annual Cash Flow:</span><strong>${metrics.annualCashFlow.toFixed(0)}</strong></div>
                  </CardContent>
                </Card>
                <div className="flex gap-2">
                  <Button onClick={exportPDF} className="flex-1"><FileText className="mr-2 h-4 w-4" />Export PDF</Button>
                  <Button onClick={exportExcel} variant="outline" className="flex-1"><FileSpreadsheet className="mr-2 h-4 w-4" />Export Excel</Button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Calculate metrics first</p>
            )}
          </TabsContent>

          <TabsContent value="projection">
            {metrics?.projection ? (
              <div className="space-y-2">
                {metrics.projection.map((year: any) => (
                  <Card key={year.year}>
                    <CardContent className="pt-4">
                      <div className="font-semibold">Year {year.year}</div>
                      <div className="text-sm space-y-1 mt-2">
                        <div className="flex justify-between"><span>Cash Flow:</span><span>${year.cashFlow.toFixed(0)}</span></div>
                        <div className="flex justify-between"><span>Cumulative:</span><span>${year.cumulativeCashFlow.toFixed(0)}</span></div>
                        <div className="flex justify-between"><span>Property Value:</span><span>${year.propertyValue.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>Equity:</span><span>${year.equity.toLocaleString()}</span></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Calculate metrics first</p>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
