import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Calculator, TrendingUp, AlertTriangle, Home } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface EnfranchisementResult {
  enfranchisementCost: number;
  breakdown: {
    capitalizedGroundRent: number;
    reversionValue: number;
    marriageValue: number;
    professionalFees: number;
    landlordCosts: number;
  };
  leaseExtensionCost: number;
  extensionBreakdown: {
    premium: number;
    fees: number;
  };
  valueAnalysis: {
    currentMarketValue: number;
    freeholdValue: number;
    valueUplift: number;
    netGain: number;
    roi: number;
  };
  shareOfFreeholdCost: number | null;
  recommendation: string;
  urgency: string;
}

export default function Enfranchisement() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EnfranchisementResult | null>(null);
  
  const [propertyValue, setPropertyValue] = useState(450000);
  const [yearsRemaining, setYearsRemaining] = useState(75);
  const [groundRent, setGroundRent] = useState(250);
  const [isFlat, setIsFlat] = useState(true);
  const [shareOfFreehold, setShareOfFreehold] = useState(false);

  const calculateEnfranchisement = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('calculate-enfranchisement', {
        body: {
          propertyValue,
          yearsRemaining,
          groundRentAnnual: groundRent,
          isFlat,
          shareOfFreehold,
        },
      });

      if (error) throw error;
      setResult(data);
      toast.success('Calculation complete');
    } catch (error: any) {
      console.error('Enfranchisement error:', error);
      toast.error(error.message || 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(value);
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'highly_recommended': return 'default';
      case 'recommended': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Enfranchisement Calculator</h1>
          <p className="text-muted-foreground mt-2">
            Calculate the cost of buying your freehold or extending your lease
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Property Details
            </CardTitle>
            <CardDescription>
              Enter your property information for an accurate calculation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Property Value (£)</label>
                <Input
                  type="number"
                  value={propertyValue}
                  onChange={(e) => setPropertyValue(Number(e.target.value))}
                  placeholder="450000"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Years Remaining on Lease</label>
                <Input
                  type="number"
                  value={yearsRemaining}
                  onChange={(e) => setYearsRemaining(Number(e.target.value))}
                  placeholder="75"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Ground Rent (Annual £)</label>
                <Input
                  type="number"
                  value={groundRent}
                  onChange={(e) => setGroundRent(Number(e.target.value))}
                  placeholder="250"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Property Type</label>
                <div className="flex gap-2">
                  <Button
                    variant={isFlat ? "default" : "outline"}
                    onClick={() => setIsFlat(true)}
                    className="flex-1"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Flat
                  </Button>
                  <Button
                    variant={!isFlat ? "default" : "outline"}
                    onClick={() => setIsFlat(false)}
                    className="flex-1"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    House
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="shareOfFreehold"
                checked={shareOfFreehold}
                onChange={(e) => setShareOfFreehold(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="shareOfFreehold" className="text-sm">
                Share of Freehold (split costs with other leaseholders)
              </label>
            </div>

            <Button onClick={calculateEnfranchisement} disabled={loading} className="w-full">
              {loading ? 'Calculating...' : 'Calculate Costs'}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="breakdown">Cost Breakdown</TabsTrigger>
              <TabsTrigger value="extension">Lease Extension</TabsTrigger>
              <TabsTrigger value="value">Value Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Enfranchisement Cost</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(result.enfranchisementCost)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Total to buy freehold</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Value Uplift</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(result.valueAnalysis.valueUplift)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      ROI: {result.valueAnalysis.roi}%
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Net Gain</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${result.valueAnalysis.netGain > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(result.valueAnalysis.netGain)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">After all costs</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recommendation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Badge variant={getRecommendationColor(result.recommendation)}>
                      {result.recommendation.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                    <Badge variant={getUrgencyColor(result.urgency)}>
                      {result.urgency.toUpperCase()} URGENCY
                    </Badge>
                  </div>
                  
                  {yearsRemaining < 80 && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-900">Marriage Value Warning</p>
                        <p className="text-sm text-amber-700">
                          Your lease has less than 80 years remaining, triggering marriage value calculations
                          which significantly increase costs. Act soon to avoid further increases.
                        </p>
                      </div>
                    </div>
                  )}

                  {shareOfFreehold && result.shareOfFreeholdCost && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="font-medium text-blue-900">Share of Freehold Cost</p>
                      <p className="text-2xl font-bold text-blue-600 mt-1">
                        {formatCurrency(result.shareOfFreeholdCost)}
                      </p>
                      <p className="text-sm text-blue-700 mt-1">
                        Split cost per leaseholder (assuming 50/50 split)
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="breakdown">
              <Card>
                <CardHeader>
                  <CardTitle>Enfranchisement Cost Breakdown</CardTitle>
                  <CardDescription>Detailed breakdown of all costs involved</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(result.breakdown).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-sm font-medium capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span className="font-bold">{formatCurrency(value)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-4 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-bold">Total Cost</span>
                      <span className="text-xl font-bold text-primary">
                        {formatCurrency(result.enfranchisementCost)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="extension">
              <Card>
                <CardHeader>
                  <CardTitle>Lease Extension Alternative</CardTitle>
                  <CardDescription>
                    Extend your lease by 90 years and reduce ground rent to peppercorn
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-primary/5 rounded-lg">
                    <div className="text-3xl font-bold text-primary mb-2">
                      {formatCurrency(result.leaseExtensionCost)}
                    </div>
                    <p className="text-sm text-muted-foreground">Total lease extension cost</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Extension Premium</span>
                      <span className="font-semibold">{formatCurrency(result.extensionBreakdown.premium)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Legal & Professional Fees</span>
                      <span className="font-semibold">{formatCurrency(result.extensionBreakdown.fees)}</span>
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-semibold mb-2">Comparison</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Saving vs. Enfranchisement</span>
                        <span className="font-bold text-green-600">
                          {formatCurrency(result.enfranchisementCost - result.leaseExtensionCost)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Lease extension is typically cheaper but you'll still be a leaseholder
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="value">
              <Card>
                <CardHeader>
                  <CardTitle>Value Analysis</CardTitle>
                  <CardDescription>Financial impact of buying the freehold</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Current Market Value</label>
                      <div className="text-2xl font-bold">
                        {formatCurrency(result.valueAnalysis.currentMarketValue)}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Freehold Value</label>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(result.valueAnalysis.freeholdValue)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Value Uplift</span>
                      <span className="text-sm font-bold">
                        {((result.valueAnalysis.valueUplift / result.valueAnalysis.currentMarketValue) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={(result.valueAnalysis.valueUplift / result.valueAnalysis.currentMarketValue) * 100} 
                      className="h-2"
                    />
                  </div>

                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-green-900">Investment Return</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-green-700">Net Gain</p>
                        <p className="text-xl font-bold text-green-900">
                          {formatCurrency(result.valueAnalysis.netGain)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-green-700">ROI</p>
                        <p className="text-xl font-bold text-green-900">
                          {result.valueAnalysis.roi}%
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
