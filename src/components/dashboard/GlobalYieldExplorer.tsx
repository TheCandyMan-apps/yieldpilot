/**
 * Global Yield Explorer
 * 
 * Multi-country yield comparison dashboard card showing
 * adjusted vs. standard yields across markets.
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

interface CountryYieldData {
  country: string;
  avg_standard_yield: number;
  avg_adjusted_yield: number;
  yield_gap: number;
  deal_count: number;
}

export function GlobalYieldExplorer() {
  const { data: yieldData, isLoading } = useQuery({
    queryKey: ['global-yield-comparison'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_global_yield_comparison' as any);
      
      if (error) throw error;
      return (data || []) as CountryYieldData[];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const maxYield = Math.max(...(yieldData?.map(d => d.avg_standard_yield) || [5]));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Regional Yield Intelligence
            </CardTitle>
            <CardDescription>
              Compare adjusted vs. standard yields across markets
            </CardDescription>
          </div>
          <Badge variant="secondary">Reality Mode</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {yieldData?.map((city) => (
            <div key={city.country} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{city.country}</span>
                  <Badge variant="outline" className="text-xs">
                    {city.deal_count} deals
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-right">
                    <span className="text-muted-foreground">Standard: </span>
                    <span className="font-semibold">{city.avg_standard_yield.toFixed(1)}%</span>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground">Adjusted: </span>
                    <span className="font-semibold">{city.avg_adjusted_yield.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {city.yield_gap < 0 ? (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    ) : (
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={city.yield_gap < 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                      {city.yield_gap.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Progress 
                    value={(city.avg_standard_yield / maxYield) * 100} 
                    className="h-2"
                  />
                </div>
                <div>
                  <Progress 
                    value={(city.avg_adjusted_yield / maxYield) * 100} 
                    className="h-2 [&>div]:bg-secondary"
                  />
                </div>
              </div>
            </div>
          ))}
          {!yieldData?.length && (
            <div className="text-center py-8 text-muted-foreground">
              No data available. Add deals to see regional comparisons.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
