/**
 * Global Yield Explorer
 * 
 * Multi-country yield comparison dashboard card showing
 * adjusted vs. standard yields across markets.
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Globe, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

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

  const chartData = yieldData?.map(d => ({
    name: d.country,
    Standard: d.avg_standard_yield,
    Adjusted: d.avg_adjusted_yield,
    Gap: d.yield_gap,
  })) || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Global Yield Intelligence
            </CardTitle>
            <CardDescription>
              Compare adjusted vs. standard yields across markets
            </CardDescription>
          </div>
          <Badge variant="secondary">Reality Mode</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="chart" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chart">Chart View</TabsTrigger>
            <TabsTrigger value="table">Table View</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chart" className="mt-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis label={{ value: 'Yield %', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Standard" fill="hsl(var(--primary))" />
                <Bar dataKey="Adjusted" fill="hsl(var(--secondary))" />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="table" className="mt-4">
            <div className="space-y-2">
              {yieldData?.map((country) => (
                <div
                  key={country.country}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="font-medium">{country.country}</div>
                    <Badge variant="outline" className="text-xs">
                      {country.deal_count} deals
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Standard</div>
                      <div className="font-semibold">{country.avg_standard_yield.toFixed(2)}%</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Adjusted</div>
                      <div className="font-semibold">{country.avg_adjusted_yield.toFixed(2)}%</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {country.yield_gap < 0 ? (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-success" />
                      )}
                      <span className={country.yield_gap < 0 ? 'text-destructive' : 'text-success'}>
                        {Math.abs(country.yield_gap).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
