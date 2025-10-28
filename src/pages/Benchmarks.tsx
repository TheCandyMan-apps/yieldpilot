import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Home, Clock, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface BenchmarkData {
  region: string;
  avg_price: number;
  avg_yield: number;
  avg_rent: number;
  avg_roi: number;
  median_days_on_market: number;
  transaction_volume: number;
  price_growth_1yr: number;
  rental_growth_1yr: number;
  sample_size: number;
}

export default function Benchmarks() {
  const [selectedRegion, setSelectedRegion] = useState('GB');

  const { data: benchmarks, isLoading } = useQuery({
    queryKey: ['benchmarks', selectedRegion],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('benchmarks', {
        body: { region: selectedRegion }
      });
      
      if (error) throw error;
      return data as BenchmarkData;
    },
  });

  const StatCard = ({ 
    icon: Icon, 
    label, 
    value, 
    trend, 
    suffix = '' 
  }: { 
    icon: any; 
    label: string; 
    value: number | string; 
    trend?: number; 
    suffix?: string;
  }) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}{suffix}</p>
          </div>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        {trend !== undefined && (
          <div className="mt-2 flex items-center gap-1 text-sm">
            {trend > 0 ? (
              <>
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-green-500">+{trend.toFixed(1)}%</span>
              </>
            ) : (
              <>
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="text-red-500">{trend.toFixed(1)}%</span>
              </>
            )}
            <span className="text-muted-foreground">vs last year</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Market Benchmarks</h1>
          <p className="text-muted-foreground">Regional property investment data</p>
        </div>
        <Select value={selectedRegion} onValueChange={setSelectedRegion}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GB">United Kingdom</SelectItem>
            <SelectItem value="US">United States</SelectItem>
            <SelectItem value="DE">Germany</SelectItem>
            <SelectItem value="ES">Spain</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : benchmarks ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              icon={DollarSign}
              label="Average Price"
              value={new Intl.NumberFormat('en-GB', {
                style: 'currency',
                currency: 'GBP',
                maximumFractionDigits: 0,
              }).format(benchmarks.avg_price)}
              trend={benchmarks.price_growth_1yr}
            />
            <StatCard
              icon={Target}
              label="Average Yield"
              value={benchmarks.avg_yield.toFixed(2)}
              suffix="%"
            />
            <StatCard
              icon={Home}
              label="Average Rent"
              value={new Intl.NumberFormat('en-GB', {
                style: 'currency',
                currency: 'GBP',
                maximumFractionDigits: 0,
              }).format(benchmarks.avg_rent)}
              trend={benchmarks.rental_growth_1yr}
            />
            <StatCard
              icon={TrendingUp}
              label="Average ROI"
              value={benchmarks.avg_roi.toFixed(1)}
              suffix="%"
            />
            <StatCard
              icon={Clock}
              label="Days on Market"
              value={benchmarks.median_days_on_market}
            />
            <StatCard
              icon={Home}
              label="Transaction Volume"
              value={benchmarks.transaction_volume.toLocaleString()}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Data Quality</CardTitle>
              <CardDescription>
                Based on {benchmarks.sample_size} properties in {selectedRegion}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant={benchmarks.sample_size > 100 ? "default" : "secondary"}>
                  {benchmarks.sample_size > 100 ? "High confidence" : "Limited data"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Last updated today
                </span>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No benchmark data available for this region</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
