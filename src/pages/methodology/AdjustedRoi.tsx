/**
 * Adjusted ROI Methodology Page
 * 
 * Explains regulation-adjusted yield calculations.
 */

import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Info, Calculator, Scale, Home, TrendingDown } from "lucide-react";

export default function AdjustedRoiMethodology() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 py-8">
        {/* Hero */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold">Reality Mode: Adjusted ROI</h1>
          <p className="text-xl text-muted-foreground">
            How YieldPilot calculates regulation-adjusted returns that reflect real-world taxes,
            compliance costs, and retrofit requirements.
          </p>
        </div>

        {/* Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              What is Reality Mode?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Standard property investment analysis often shows optimistic gross yields that
              don't account for regulatory changes. Reality Mode applies:
            </p>
            <ul className="space-y-2 ml-6 list-disc text-muted-foreground">
              <li><strong>Tax regulations</strong> (UK Section 24, progressive income tax)</li>
              <li><strong>EPC upgrade costs</strong> (amortized retrofit to meet minimum standards)</li>
              <li><strong>Licensing fees</strong> (HMO, selective licensing, compliance)</li>
              <li><strong>Operating assumptions</strong> (country-specific vacancy, maintenance)</li>
            </ul>
            <p className="text-sm text-muted-foreground">
              Result: After-tax, regulation-adjusted yield that's more realistic for decision-making.
            </p>
          </CardContent>
        </Card>

        {/* UK Section 24 */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              UK Section 24 Tax Treatment
            </CardTitle>
            <CardDescription>How mortgage interest is taxed for UK landlords</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Since April 2020, UK landlords can no longer deduct mortgage interest from rental income before tax.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-semibold mb-2">How it works:</p>
                <ol className="space-y-2 text-sm text-muted-foreground list-decimal ml-5">
                  <li>Calculate rental profit <strong>without</strong> deducting mortgage interest</li>
                  <li>Apply progressive income tax (20%/40%/45%) on that profit</li>
                  <li>Get a 20% tax credit on mortgage interest payments</li>
                </ol>
              </div>

              <div className="p-4 border rounded-lg">
                <p className="text-sm font-semibold mb-2">Example:</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Annual rent:</span>
                    <span>£18,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Operating expenses:</span>
                    <span>-£4,500</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mortgage interest:</span>
                    <span>-£8,000</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 mt-2">
                    <span className="text-muted-foreground">Taxable income (no deduction):</span>
                    <span className="font-semibold">£13,500</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax @ 40% (higher rate):</span>
                    <span className="text-destructive">-£5,400</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax credit @ 20% of interest:</span>
                    <span className="text-green-600">+£1,600</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 mt-2">
                    <span className="font-semibold">After-tax cashflow:</span>
                    <span className="font-bold">£1,700</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Higher-rate taxpayers are significantly impacted. Basic-rate taxpayers (20%) are less affected
                since the credit matches their tax rate.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* EPC Costs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              EPC Upgrade Costs
            </CardTitle>
            <CardDescription>Minimum Energy Performance Certificate requirements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Many jurisdictions are implementing minimum EPC ratings for rental properties.
              In the UK, the target is moving toward EPC C by 2028.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg">
                <p className="text-sm font-semibold mb-1">Current Minimum</p>
                <Badge variant="secondary" className="text-base">EPC E</Badge>
              </div>
              <div className="p-3 border rounded-lg bg-green-50">
                <p className="text-sm font-semibold mb-1">2028 Target</p>
                <Badge className="text-base bg-green-600">EPC C</Badge>
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-semibold mb-2">Typical Retrofit Costs:</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• E → C: £5,000 - £12,000 (flats/terraced)</li>
                <li>• D → C: £3,000 - £8,000</li>
                <li>• Detached houses: £15,000 - £25,000</li>
              </ul>
              <p className="text-xs mt-3 text-muted-foreground">
                Costs amortized over 7 years in adjusted yield calculations.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Formula */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Calculation Formula
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="font-mono text-sm space-y-2 p-4 bg-muted rounded-lg overflow-x-auto">
              <p><strong>annual_rent</strong> = gross_rent_month × 12</p>
              <p><strong>operating_expenses</strong> = annual_rent × opex_pct</p>
              <p><strong>vacancy_cost</strong> = annual_rent × vacancy_pct</p>
              <p><strong>pre_interest_net</strong> = annual_rent - operating_expenses - vacancy_cost</p>
              <p className="pt-2 border-t"><strong>mortgage_interest</strong> = price × ltv × interest_rate</p>
              <p className="pt-2 border-t text-amber-700">
                <strong>taxable_income</strong> = pre_interest_net (no deduction for Section 24)
              </p>
              <p><strong>tax_due</strong> = apply_progressive_bands(taxable_income) - (mortgage_interest × 0.20)</p>
              <p className="pt-2 border-t"><strong>epc_upgrade</strong> = retrofit_cost / 7 / 12 (monthly)</p>
              <p><strong>licensing</strong> = hmo_cost_month (if applicable)</p>
              <p className="pt-2 border-t text-green-700">
                <strong>after_tax_cashflow</strong> = pre_interest_net - mortgage_interest - tax_due - epc_upgrade - licensing
              </p>
              <p className="pt-2 border-t text-blue-700 font-bold">
                <strong>adjusted_net_yield_pct</strong> = (after_tax_cashflow / price) × 100
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Disclaimers */}
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <TrendingDown className="h-5 w-5" />
              Important Disclaimers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-amber-900">
            <p>
              <strong>Not Financial or Tax Advice:</strong> These calculations are estimates using
              publicly available rates and assumptions. Always consult qualified tax and financial advisors.
            </p>
            <p>
              <strong>Property-Specific Variations:</strong> Actual costs vary significantly based on
              property condition, location, and individual circumstances.
            </p>
            <p>
              <strong>Regulatory Changes:</strong> Tax rules and energy efficiency requirements change.
              Verify current regulations in your jurisdiction.
            </p>
            <p>
              <strong>User Responsibility:</strong> You can override assumptions in the Underwrite drawer.
              Validate all inputs against your specific situation.
            </p>
          </CardContent>
        </Card>

        {/* Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Data Sources & References</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• UK Tax Bands: HMRC 2024/25 rates</li>
              <li>• Section 24: Finance Act 2015, fully implemented 2020</li>
              <li>• EPC Requirements: MEES Regulations 2015 (amended 2020)</li>
              <li>• Retrofit Costs: Energy Saving Trust estimates 2024</li>
              <li>• Operating Assumptions: Industry averages (ARLA, NRLA)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
