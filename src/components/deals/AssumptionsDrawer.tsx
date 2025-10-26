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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Settings, RotateCcw, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

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

const PRESETS = {
  BTL_UK: {
    name: "BTL UK",
    deposit_pct: 25,
    apr: 5.5,
    term_years: 25,
    interest_only: true,
    voids_pct: 5,
    maintenance_pct: 8,
    management_pct: 10,
    insurance_annual: 300,
  },
  HMO_UK: {
    name: "HMO UK",
    deposit_pct: 20,
    apr: 6.5,
    term_years: 25,
    interest_only: true,
    voids_pct: 8,
    maintenance_pct: 12,
    management_pct: 12,
    insurance_annual: 600,
  },
  CASH_BUYER: {
    name: "Cash buyer",
    deposit_pct: 100,
    apr: 0,
    term_years: 0,
    interest_only: true,
    voids_pct: 4,
    maintenance_pct: 6,
    management_pct: 0,
    insurance_annual: 250,
  },
};

const UK_MARKET_DEFAULTS: Assumptions = PRESETS.BTL_UK;

interface AssumptionsDrawerProps {
  assumptions: Assumptions;
  onUpdate: (assumptions: Assumptions, saveAsDefault?: boolean) => Promise<boolean> | void;
  trigger?: React.ReactNode;
  listingId?: string;
  price?: number;
  rent?: number;
}

export const AssumptionsDrawer = ({ 
  assumptions, 
  onUpdate,
  trigger,
  listingId,
  price = 200000,
  rent = 1000,
}: AssumptionsDrawerProps) => {
  const [localAssumptions, setLocalAssumptions] = useState(assumptions);
  const [showWorking, setShowWorking] = useState(false);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const { toast } = useToast();

  const handlePreset = (preset: Assumptions & { name: string }) => {
    const { name, ...presetValues } = preset;
    setLocalAssumptions(presetValues);
    toast({
      title: `Applied ${name}`,
      description: "Adjust individual fields if needed",
    });
  };

  const handleReset = () => {
    setLocalAssumptions(UK_MARKET_DEFAULTS);
    toast({
      title: "Reset to UK defaults",
      description: "75% LTV, 5.5% APR, Interest-only",
    });
  };

  const handleApply = async () => {
    const result = onUpdate(localAssumptions, saveAsDefault);
    if (result instanceof Promise) {
      const success = await result;
      if (success && saveAsDefault) {
        toast({
          title: "Assumptions updated",
          description: "Saved as your default for future deals",
        });
      } else if (success) {
        toast({
          title: "Assumptions updated",
          description: "KPIs will recalculate with your settings",
        });
      }
    } else {
      toast({
        title: "Assumptions updated",
        description: saveAsDefault 
          ? "Saved as your default for future deals"
          : "KPIs will recalculate with your settings",
      });
    }
  };

  const updateField = (field: keyof Assumptions, value: any) => {
    setLocalAssumptions(prev => ({ ...prev, [field]: value }));
  };
  const deposit = price * (localAssumptions.deposit_pct / 100);
  const loan = price - deposit;
  const mortgageMonthly = localAssumptions.interest_only
    ? (loan * localAssumptions.apr / 100) / 12
    : 0;
  const opexMonthly = 
    rent * (localAssumptions.voids_pct / 100) +
    rent * (localAssumptions.maintenance_pct / 100) +
    rent * (localAssumptions.management_pct / 100) +
    localAssumptions.insurance_annual / 12;

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
            Choose a preset or customize your assumptions
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Presets */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Quick Presets</h3>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePreset(PRESETS.BTL_UK)}
                className="text-xs"
              >
                BTL UK
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePreset(PRESETS.HMO_UK)}
                className="text-xs"
              >
                HMO UK
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePreset(PRESETS.CASH_BUYER)}
                className="text-xs"
              >
                Cash Buyer
              </Button>
            </div>
          </div>

          <Separator />

          {/* Working Section (Collapsible) */}
          <Collapsible open={showWorking} onOpenChange={setShowWorking}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                <h3 className="font-semibold text-sm">Show Working</h3>
                <ChevronDown className={`h-4 w-4 transition-transform ${showWorking ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-3">
              <div className="bg-muted/50 p-3 rounded-md space-y-1 text-xs font-mono">
                <p><span className="text-muted-foreground">Price:</span> £{price.toLocaleString()}</p>
                <p><span className="text-muted-foreground">Deposit:</span> £{deposit.toLocaleString()} ({localAssumptions.deposit_pct}%)</p>
                <p><span className="text-muted-foreground">Mortgage:</span> £{loan.toLocaleString()}</p>
                <p><span className="text-muted-foreground">Rent/mo:</span> £{rent.toLocaleString()}</p>
                <p><span className="text-muted-foreground">Mortgage/mo:</span> £{mortgageMonthly.toFixed(2)}</p>
                <p><span className="text-muted-foreground">OpEx/mo:</span> £{opexMonthly.toFixed(2)}</p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator />
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
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="save-default"
                checked={saveAsDefault}
                onCheckedChange={setSaveAsDefault}
              />
              <Label htmlFor="save-default" className="text-sm">
                Save as my default for future deals
              </Label>
            </div>
            
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
