/**
 * Explainability Drawer
 * 
 * Shows detailed breakdown of adjusted ROI calculations.
 * Displays explain_json from v_adjusted_metrics.
 */

import { Info, TrendingDown } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ExplainabilityDrawerProps {
  explainJson: {
    tax_method: string;
    tax_due: number;
    epc_cost_annual: number;
    epc_gap: boolean;
    licensing_annual: number;
    penalties_applied: (string | null)[];
  };
  standardYield: number;
  adjustedYield: number;
  trigger?: React.ReactNode;
}

export function ExplainabilityDrawer({
  explainJson,
  standardYield,
  adjustedYield,
  trigger,
}: ExplainabilityDrawerProps) {
  const yieldDrop = standardYield - adjustedYield;
  const yieldDropPct = (yieldDrop / standardYield) * 100;

  const penalties = explainJson.penalties_applied.filter(Boolean);

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Info className="h-4 w-4 mr-2" />
            Why?
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Adjusted ROI Breakdown</SheetTitle>
          <SheetDescription>
            How regulations affect your returns
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Yield Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Yield Impact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Standard Gross Yield</span>
                <span className="font-semibold">{standardYield.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between items-center text-destructive">
                <span className="text-sm flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  After Regulations
                </span>
                <span className="font-semibold">{adjustedYield.toFixed(2)}%</span>
              </div>
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Reduction</span>
                  <Badge variant="destructive">
                    -{yieldDrop.toFixed(2)}% ({yieldDropPct.toFixed(0)}%)
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tax Method */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tax Treatment</CardTitle>
              <CardDescription>{explainJson.tax_method}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Annual Tax Due</span>
                <span className="font-semibold">
                  £{explainJson.tax_due.toLocaleString()}
                </span>
              </div>
              {explainJson.tax_method.includes('Section 24') && (
                <p className="text-xs text-muted-foreground mt-2">
                  UK Section 24: No mortgage interest deduction, 20% tax credit applied.
                </p>
              )}
            </CardContent>
          </Card>

          {/* EPC Costs */}
          {explainJson.epc_gap && (
            <Card className="border-orange-200 bg-orange-50/50">
              <CardHeader>
                <CardTitle className="text-base">EPC Upgrade Required</CardTitle>
                <CardDescription>Property needs retrofit to meet minimum standard</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Annual Cost (amortized)</span>
                  <span className="font-semibold">
                    £{explainJson.epc_cost_annual.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Assumes 7-year amortization of retrofit costs.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Licensing */}
          {explainJson.licensing_annual > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Licensing & Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Annual Cost</span>
                  <span className="font-semibold">
                    £{explainJson.licensing_annual.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Includes HMO licensing, selective licensing, and compliance costs.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Penalties */}
          {penalties.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader>
                <CardTitle className="text-base">Score Penalties Applied</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {penalties.map((penalty, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <span className="text-amber-600">•</span>
                      <span>{penalty}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Disclaimer */}
          <div className="p-4 bg-muted rounded-lg text-xs text-muted-foreground">
            <p className="font-semibold mb-1">Important Disclaimer</p>
            <p>
              These calculations use public tax rates and estimated costs. Not tax or financial advice.
              Always consult qualified professionals and verify local requirements.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
