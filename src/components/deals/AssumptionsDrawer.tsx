import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Settings, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Assumptions {
  deposit_pct: number;
  apr: number;
  term_years: number;
  interest_only: boolean;
  voids_pct: number;
  maintenance_pct: number;
  management_pct: number;
  insurance_annual: number;
}

const UK_MARKET_DEFAULTS: Assumptions = {
  deposit_pct: 25,
  apr: 5.5,
  term_years: 25,
  interest_only: true,
  voids_pct: 5,
  maintenance_pct: 8,
  management_pct: 10,
  insurance_annual: 300,
};

interface AssumptionsDrawerProps {
  assumptions: Assumptions;
  onUpdate: (assumptions: Assumptions) => void;
  trigger?: React.ReactNode;
}

export const AssumptionsDrawer = ({ 
  assumptions, 
  onUpdate,
  trigger 
}: AssumptionsDrawerProps) => {
  const [localAssumptions, setLocalAssumptions] = useState(assumptions);
  const { toast } = useToast();

  const handleReset = () => {
    setLocalAssumptions(UK_MARKET_DEFAULTS);
    toast({
      title: "Reset to UK defaults",
      description: "75% LTV, 5.5% APR, Interest-only",
    });
  };

  const handleApply = () => {
    onUpdate(localAssumptions);
    toast({
      title: "Assumptions updated",
      description: "KPIs will recalculate with your settings",
    });
  };

  const updateField = (field: keyof Assumptions, value: any) => {
    setLocalAssumptions(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Assumptions
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Underwriting Assumptions</SheetTitle>
          <SheetDescription>
            These are your underwriting assumptions. Adjust to match your lender or strategy.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Finance */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Finance</h3>
            
            <div className="space-y-2">
              <Label htmlFor="deposit_pct">Deposit %</Label>
              <Input
                id="deposit_pct"
                type="number"
                min="0"
                max="100"
                value={localAssumptions.deposit_pct}
                onChange={(e) => updateField("deposit_pct", parseFloat(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                UK BTL standard: 25% (75% LTV)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apr">Interest Rate (APR) %</Label>
              <Input
                id="apr"
                type="number"
                step="0.1"
                min="0"
                value={localAssumptions.apr}
                onChange={(e) => updateField("apr", parseFloat(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="term_years">Term (Years)</Label>
              <Input
                id="term_years"
                type="number"
                min="1"
                max="40"
                value={localAssumptions.term_years}
                onChange={(e) => updateField("term_years", parseInt(e.target.value))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="interest_only">Interest Only</Label>
              <Switch
                id="interest_only"
                checked={localAssumptions.interest_only}
                onCheckedChange={(checked) => updateField("interest_only", checked)}
              />
            </div>
          </div>

          {/* Operating Costs */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Operating Costs (% of Rent)</h3>

            <div className="space-y-2">
              <Label htmlFor="voids_pct">Voids %</Label>
              <Input
                id="voids_pct"
                type="number"
                step="0.5"
                min="0"
                value={localAssumptions.voids_pct}
                onChange={(e) => updateField("voids_pct", parseFloat(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maintenance_pct">Maintenance %</Label>
              <Input
                id="maintenance_pct"
                type="number"
                step="0.5"
                min="0"
                value={localAssumptions.maintenance_pct}
                onChange={(e) => updateField("maintenance_pct", parseFloat(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="management_pct">Management %</Label>
              <Input
                id="management_pct"
                type="number"
                step="0.5"
                min="0"
                value={localAssumptions.management_pct}
                onChange={(e) => updateField("management_pct", parseFloat(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="insurance_annual">Insurance (£/year)</Label>
              <Input
                id="insurance_annual"
                type="number"
                min="0"
                value={localAssumptions.insurance_annual}
                onChange={(e) => updateField("insurance_annual", parseFloat(e.target.value))}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Button onClick={handleApply} className="w-full">
              Apply Assumptions
            </Button>
            <Button onClick={handleReset} variant="outline" className="w-full">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to UK Market Defaults
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
