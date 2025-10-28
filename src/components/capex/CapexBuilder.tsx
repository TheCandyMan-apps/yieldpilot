import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Save, Calculator } from 'lucide-react';
import { calculateCapExTotal, calculateCapExImpact, applyCapExToKPIs, UK_CAPEX_TEMPLATES, type CapExLine } from '@/lib/capex';
import { formatCurrency } from '@/lib/portfolioCalculations';
import { Separator } from '@/components/ui/separator';

interface CapexBuilderProps {
  currentKPIs: any;
  assumptions: any;
  propertyPrice: number;
  onApplyCapex: (total: number, breakdown: CapExLine[], annualReserve: number, updatedKPIs: any) => void;
}

export function CapexBuilder({ currentKPIs, assumptions, propertyPrice, onApplyCapex }: CapexBuilderProps) {
  const [lines, setLines] = useState<CapExLine[]>([]);

  const addLine = (template?: CapExLine) => {
    setLines([...lines, template || {
      item: '',
      category: 'other' as const,
      unit_cost: 0,
      qty: 1,
      recurring: false,
      lifespan_years: 0,
      contingency_pct: 10,
    }]);
  };

  const updateLine = (index: number, field: keyof CapExLine, value: any) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const loadTemplate = (templateName: string) => {
    const template = UK_CAPEX_TEMPLATES.find(t => t.name === templateName);
    if (template) {
      setLines(template.lines);
    }
  };

  const capexImpact = calculateCapExImpact(lines, currentKPIs?.working);
  const updatedKPIs = applyCapExToKPIs(currentKPIs, capexImpact, propertyPrice);

  const handleApply = () => {
    onApplyCapex(capexImpact.total_with_contingency, lines, capexImpact.annual_reserve, updatedKPIs);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            CapEx Builder
          </CardTitle>
          <Select onValueChange={loadTemplate}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Load template" />
            </SelectTrigger>
            <SelectContent>
              {UK_CAPEX_TEMPLATES.map(template => (
                <SelectItem key={template.name} value={template.name}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {lines.map((line, idx) => (
            <div key={idx} className="flex gap-2 items-end">
              <div className="flex-1 grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-xs">Item</Label>
                  <Input
                    value={line.item}
                    onChange={(e) => updateLine(idx, 'item', e.target.value)}
                    placeholder="e.g., New boiler"
                  />
                </div>
                <div>
                  <Label className="text-xs">Cost (£)</Label>
                  <Input
                    type="number"
                    value={line.unit_cost}
                    onChange={(e) => updateLine(idx, 'unit_cost', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Qty</Label>
                  <Input
                    type="number"
                    value={line.qty}
                    onChange={(e) => updateLine(idx, 'qty', parseInt(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Lifespan (yrs)</Label>
                  <Input
                    type="number"
                    value={line.lifespan_years || 0}
                    onChange={(e) => updateLine(idx, 'lifespan_years', parseInt(e.target.value) || 0)}
                    disabled={!line.recurring}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={line.recurring}
                    onCheckedChange={(checked) => updateLine(idx, 'recurring', checked)}
                  />
                  <Label className="text-xs">Recurring</Label>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLine(idx)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={() => addLine()} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Line Item
        </Button>

        <Separator />

        <div className="space-y-2">
          <div className="flex justify-between text-lg font-bold">
            <span>Total CapEx:</span>
            <span>{formatCurrency(capexImpact.total_with_contingency)}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Annual Reserve:</span>
            <span>{formatCurrency(capexImpact.annual_reserve)}/year</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Impact on KPIs:</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Monthly Cashflow:</span>
              <div className="flex items-center gap-2">
                <span className="line-through">{formatCurrency(currentKPIs?.working?.net_monthly_cashflow || 0)}</span>
                <span className="font-medium">{formatCurrency(updatedKPIs?.working?.net_monthly_cashflow || 0)}</span>
                {(updatedKPIs?.working?.net_monthly_cashflow || 0) < (currentKPIs?.working?.net_monthly_cashflow || 0) && (
                  <Badge variant="destructive" className="text-xs">
                    {formatCurrency((updatedKPIs?.working?.net_monthly_cashflow || 0) - (currentKPIs?.working?.net_monthly_cashflow || 0))}
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Net Yield:</span>
              <div className="flex items-center gap-2">
                <span className="line-through">{(currentKPIs?.working?.net_yield_pct || 0).toFixed(2)}%</span>
                <span className="font-medium">{(updatedKPIs?.working?.net_yield_pct || 0).toFixed(2)}%</span>
              </div>
            </div>
          </div>
        </div>

        <Button onClick={handleApply} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          Apply CapEx
        </Button>
      </CardContent>
    </Card>
  );
}
