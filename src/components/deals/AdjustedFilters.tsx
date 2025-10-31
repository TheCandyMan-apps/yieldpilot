/**
 * Adjusted Filters
 * 
 * Additional filters for regulation-adjusted metrics.
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AdjustedFiltersProps {
  minAdjustedYield: number;
  onMinAdjustedYieldChange: (value: number) => void;
  strategyFilter: string;
  onStrategyFilterChange: (value: string) => void;
}

const strategies = [
  { value: 'all', label: 'All Strategies' },
  { value: 'LTR', label: 'Long-Term Rental' },
  { value: 'HMO', label: 'HMO' },
  { value: 'BRRR', label: 'BRRR' },
  { value: 'STR', label: 'Short-Term Rental' },
];

export function AdjustedFilters({
  minAdjustedYield,
  onMinAdjustedYieldChange,
  strategyFilter,
  onStrategyFilterChange,
}: AdjustedFiltersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-card">
      <div className="space-y-2">
        <Label htmlFor="min-adjusted-yield" className="text-sm">
          Min Adjusted Yield %
        </Label>
        <Input
          id="min-adjusted-yield"
          type="number"
          step="0.1"
          min="0"
          max="100"
          value={minAdjustedYield || ''}
          onChange={(e) => onMinAdjustedYieldChange(parseFloat(e.target.value) || 0)}
          placeholder="e.g., 4.5"
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="strategy-filter" className="text-sm">
          Optimize For Strategy
        </Label>
        <Select value={strategyFilter} onValueChange={onStrategyFilterChange}>
          <SelectTrigger id="strategy-filter">
            <SelectValue placeholder="Select strategy" />
          </SelectTrigger>
          <SelectContent>
            {strategies.map((strategy) => (
              <SelectItem key={strategy.value} value={strategy.value}>
                {strategy.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
