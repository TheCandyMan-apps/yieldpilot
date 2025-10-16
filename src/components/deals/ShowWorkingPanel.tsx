import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calculator } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface ShowWorkingPanelProps {
  kpis: any;
  provenance?: any;
}

export const ShowWorkingPanel = ({ kpis, provenance }: ShowWorkingPanelProps) => {
  if (!kpis?.working) return null;

  const working = kpis.working;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Show Working
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          All calculations explained with formulas and inputs
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Provenance Chips */}
        {provenance && (
          <div className="flex flex-wrap gap-2 pb-2">
            <Badge variant="outline">Zoopla</Badge>
            <Badge variant="outline">EPC (Estimated)</Badge>
            <Badge variant="outline">Crime (Estimated)</Badge>
            <Badge variant="outline">Flood (Estimated)</Badge>
            {provenance.timestamp && (
              <Badge variant="outline">
                Refreshed: {new Date(provenance.timestamp).toLocaleDateString()}
              </Badge>
            )}
          </div>
        )}

        <Separator />

        {/* Finance */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Finance</h4>
          <div className="space-y-1 text-sm font-mono">
            <p><span className="text-muted-foreground">Deposit:</span> {working.deposit}</p>
            <p><span className="text-muted-foreground">Loan:</span> {working.loan}</p>
            <p><span className="text-muted-foreground">Mortgage:</span> {working.mortgage}</p>
          </div>
        </div>

        <Separator />

        {/* Operating Costs */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Operating Costs</h4>
          <p className="text-sm font-mono">{working.opex}</p>
        </div>

        <Separator />

        {/* Returns */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Returns</h4>
          <div className="space-y-1 text-sm font-mono">
            <p><span className="text-muted-foreground">Gross Yield:</span> {working.gross_yield}</p>
            <p><span className="text-muted-foreground">Net Yield:</span> {working.net_yield}</p>
            <p><span className="text-muted-foreground">Cashflow:</span> {working.cashflow}</p>
            <p><span className="text-muted-foreground">ROI:</span> {working.roi}</p>
            <p><span className="text-muted-foreground">DSCR:</span> {working.dscr}</p>
          </div>
        </div>

        <Separator />

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground italic">
          Informational only; not financial advice. Verify data with official sources.
        </p>
      </CardContent>
    </Card>
  );
};
