import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface ForecastUsageStat {
  date: string;
  count: number;
  model_version: string;
}

export default function ForecastUsage() {
  const [usage, setUsage] = useState<ForecastUsageStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayCount, setTodayCount] = useState(0);
  const [tier, setTier] = useState<string>('free');

  useEffect(() => {
    loadUsage();
  }, []);

  const loadUsage = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user tier
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .single();

      setTier(profile?.subscription_tier || 'free');

      // Get usage stats
      const { data, error } = await supabase
        .from('forecast_usage')
        .select('created_at, model_version')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Aggregate by date
      const stats = data.reduce((acc: Record<string, ForecastUsageStat>, item) => {
        const date = new Date(item.created_at).toLocaleDateString();
        if (!acc[date]) {
          acc[date] = { date, count: 0, model_version: item.model_version || 'unknown' };
        }
        acc[date].count++;
        return acc;
      }, {});

      const today = new Date().toLocaleDateString();
      setTodayCount(stats[today]?.count || 0);
      setUsage(Object.values(stats));
    } catch (error: any) {
      console.error('Failed to load usage:', error);
      toast.error('Failed to load forecast usage');
    } finally {
      setLoading(false);
    }
  };

  const dailyLimit = tier === 'free' ? 1 : tier === 'starter' ? 3 : tier === 'pro' ? 10 : -1;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8" />
            Forecast Usage
          </h1>
          <p className="text-muted-foreground">Track your AI forecast consumption</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Today's Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{todayCount}</span>
                {dailyLimit !== -1 && (
                  <span className="text-muted-foreground">/ {dailyLimit}</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold capitalize">{tier}</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">
                {usage
                  .filter(u => new Date(u.date).getMonth() === new Date().getMonth())
                  .reduce((sum, u) => sum + u.count, 0)}
              </span>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Usage History</CardTitle>
            <CardDescription>Last 100 forecasts</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : usage.length === 0 ? (
              <p className="text-muted-foreground">No forecasts generated yet</p>
            ) : (
              <div className="space-y-2">
                {usage.map((stat, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted"
                  >
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="font-medium">{stat.date}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">{stat.model_version}</span>
                      <span className="font-bold">{stat.count} forecasts</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
