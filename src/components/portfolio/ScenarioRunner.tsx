import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Play, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';
import { UK_SCENARIOS, formatScenarioDelta, type ScenarioParameters } from '@/lib/scenarios';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatPercentage } from '@/lib/portfolioCalculations';

interface ScenarioRunnerProps {
  portfolioId: string;
  baselineMetrics: any;
  onResultsReady?: (results: any[]) => void;
}

export function ScenarioRunner({ portfolioId, baselineMetrics, onResultsReady }: ScenarioRunnerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [customScenario, setCustomScenario] = useState<ScenarioParameters>({
    name: 'Custom Scenario',
    interest_rate_change_bps: 0,
    rent_change_pct: 0,
    void_rate_change_pct: 0,
  });

  const runScenarios = async (scenarios: ScenarioParameters[]) => {
    setIsRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('scenario-runner', {
        body: { portfolioId, scenarios },
      });

      if (error) throw error;

      setResults(data.scenarios);
      if (onResultsReady) onResultsReady(data.scenarios);
      toast.success('Scenarios completed');
    } catch (error: any) {
      console.error('Scenario error:', error);
      toast.error(error.message || 'Failed to run scenarios');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Quick Scenarios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {UK_SCENARIOS.map((scenario) => (
              <Button
                key={scenario.name}
                variant="outline"
                size="sm"
                onClick={() => runScenarios([scenario])}
                disabled={isRunning}
              >
                {scenario.name}
              </Button>
            ))}
          </div>
          <Button
            variant="default"
            className="w-full mt-4"
            onClick={() => runScenarios(UK_SCENARIOS)}
            disabled={isRunning}
          >
            <Play className="h-4 w-4 mr-2" />
            Run All Scenarios
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom Scenario</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Interest Rate Change: {customScenario.interest_rate_change_bps || 0} bps</Label>
            <Slider
              value={[customScenario.interest_rate_change_bps || 0]}
              onValueChange={([value]) => setCustomScenario({ ...customScenario, interest_rate_change_bps: value })}
              min={-200}
              max={300}
              step={25}
            />
          </div>
          <div className="space-y-2">
            <Label>Rent Change: {customScenario.rent_change_pct || 0}%</Label>
            <Slider
              value={[customScenario.rent_change_pct || 0]}
              onValueChange={([value]) => setCustomScenario({ ...customScenario, rent_change_pct: value })}
              min={-20}
              max={20}
              step={1}
            />
          </div>
          <div className="space-y-2">
            <Label>Void Rate Change: {customScenario.void_rate_change_pct || 0}%</Label>
            <Slider
              value={[customScenario.void_rate_change_pct || 0]}
              onValueChange={([value]) => setCustomScenario({ ...customScenario, void_rate_change_pct: value })}
              min={-5}
              max={10}
              step={1}
            />
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => runScenarios([customScenario])}
            disabled={isRunning}
          >
            Run Custom Scenario
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.map((result, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{result.name}</h4>
                  {result.risk_flags.length > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {result.risk_flags.length} risks
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Monthly Cashflow:</span>
                    <div className="flex items-center gap-2">
                      {result.delta.monthly_cashflow >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-success" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      )}
                      <span className={result.delta.monthly_cashflow >= 0 ? 'text-success' : 'text-destructive'}>
                        {formatScenarioDelta(result.delta.monthly_cashflow)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Portfolio Yield:</span>
                    <div className="flex items-center gap-2">
                      {result.delta.portfolio_yield >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-success" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      )}
                      <span className={result.delta.portfolio_yield >= 0 ? 'text-success' : 'text-destructive'}>
                        {formatScenarioDelta(result.delta.portfolio_yield, true)}
                      </span>
                    </div>
                  </div>
                </div>

                {result.risk_flags.length > 0 && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <ul className="list-disc list-inside space-y-1">
                        {result.risk_flags.map((flag: string, i: number) => (
                          <li key={i}>{flag}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {idx < results.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
