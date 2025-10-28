import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface ForecastData {
  forecast_horizon: string;
  predicted_yield_low: number;
  predicted_yield_mid: number;
  predicted_yield_high: number;
  predicted_appreciation_pct: number;
  confidence_score: number;
  computed_at: string;
  ai_reasoning?: string;
}

export function ForecastPanel({ listingId }: { listingId: string }) {
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(false);
  const [horizon, setHorizon] = useState('24m');

  useEffect(() => {
    loadForecast();
  }, [listingId, horizon]);

  const loadForecast = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('forecast', {
        body: { listingId, horizon }
      });

      if (error) throw error;
      setForecast(data);
    } catch (error: any) {
      console.error('Failed to load forecast:', error);
      toast.error('Failed to load yield forecast');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>Yield Forecast™</CardTitle>
          </div>
          <CardDescription>AI-powered yield predictions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!forecast) return null;

  const getYieldTrend = () => {
    const mid = forecast.predicted_yield_mid;
    if (mid > 8) return { icon: TrendingUp, color: 'text-green-600', label: 'Strong' };
    if (mid > 6) return { icon: Minus, color: 'text-yellow-600', label: 'Moderate' };
    return { icon: TrendingDown, color: 'text-red-600', label: 'Weak' };
  };

  const trend = getYieldTrend();
  const TrendIcon = trend.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>Yield Forecast™</CardTitle>
          </div>
          <Badge variant="secondary">
            {(forecast.confidence_score * 100).toFixed(0)}% confidence
          </Badge>
        </div>
        <CardDescription>AI-powered yield predictions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Horizon selector */}
        <Tabs value={horizon} onValueChange={setHorizon}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="12m">12 months</TabsTrigger>
            <TabsTrigger value="24m">24 months</TabsTrigger>
            <TabsTrigger value="36m">36 months</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Yield prediction */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Predicted Net Yield</span>
            <div className="flex items-center gap-1">
              <TrendIcon className={`h-4 w-4 ${trend.color}`} />
              <span className={`text-sm font-medium ${trend.color}`}>{trend.label}</span>
            </div>
          </div>
          
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{forecast.predicted_yield_mid.toFixed(2)}%</span>
            <span className="text-sm text-muted-foreground">
              Range: {forecast.predicted_yield_low.toFixed(2)}% - {forecast.predicted_yield_high.toFixed(2)}%
            </span>
          </div>

          {/* Visual range bar */}
          <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="absolute h-full bg-gradient-to-r from-yellow-500 via-green-500 to-blue-500 opacity-50"
              style={{
                left: `${Math.max(0, (forecast.predicted_yield_low / 15) * 100)}%`,
                right: `${Math.max(0, 100 - (forecast.predicted_yield_high / 15) * 100)}%`
              }}
            />
            <div 
              className="absolute h-full w-1 bg-primary"
              style={{ left: `${(forecast.predicted_yield_mid / 15) * 100}%` }}
            />
          </div>
        </div>

        {/* Capital appreciation */}
        <div className="space-y-2">
          <span className="text-sm text-muted-foreground">Expected Capital Appreciation</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {forecast.predicted_appreciation_pct > 0 ? '+' : ''}
              {forecast.predicted_appreciation_pct.toFixed(1)}%
            </span>
            <span className="text-sm text-muted-foreground">over {horizon}</span>
          </div>
        </div>

        {/* AI reasoning */}
        {forecast.ai_reasoning && (
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">AI Insights</span>
            </div>
            <p className="text-sm text-muted-foreground">{forecast.ai_reasoning}</p>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground">
          Forecasts are predictions based on historical data and market trends. Actual results may vary.
        </p>
      </CardContent>
    </Card>
  );
}