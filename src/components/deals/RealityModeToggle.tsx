/**
 * Reality Mode Toggle
 * 
 * Switches between standard and regulation-adjusted yield views.
 */

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface RealityModeToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export function RealityModeToggle({ enabled, onChange }: RealityModeToggleProps) {
  return (
    <div className="flex items-center space-x-3 p-4 border rounded-lg bg-card">
      <Switch
        id="reality-mode"
        checked={enabled}
        onCheckedChange={onChange}
      />
      <Label htmlFor="reality-mode" className="cursor-pointer flex items-center gap-2">
        <span className="text-sm font-medium">
          Reality Mode
          {enabled && <span className="text-xs text-muted-foreground ml-1">(Adjusted ROI)</span>}
        </span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">
                Reality Mode applies local taxes (e.g., UK Section 24), EPC upgrade costs,
                and licensing fees to show after-tax, regulation-adjusted yield.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                We model rules using public rates; not tax advice. Override in Underwrite drawer.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </Label>
    </div>
  );
}
