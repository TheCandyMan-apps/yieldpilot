import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Activity, TrendingUp, Map, AlertTriangle, Sparkles, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AIHealth {
  status: string;
  ai: {
    available: boolean;
    status: string;
    latency_ms: number;
    model_version: string;
  };
  user: {
    tier: string;
    usage_today: number;
    usage_month: number;
    quota_remaining: number;
  } | null;
  system: {
    total_forecasts: number;
    forecasts_today: number;
    uptime_pct: number;
  };
}

interface RegionalData {
  region: string;
  count: number;
  avgYield: number;
  avgRisk: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AITelemetry() {
  const [health, setHealth] = useState<AIHealth | null>(null);
  const [dailyUsage, setDailyUsage] = useState<any[]>([]);
  const [regionalData, setRegionalData] = useState<RegionalData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTelemetry();
    const interval = setInterval(loadTelemetry, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadTelemetry = async () => {
    try {
      // Get AI health
      const { data: healthData, error: healthError } = await supabase.functions.invoke('health-ai');
      if (healthError) throw healthError;
      setHealth(healthData);

      // Get usage over last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usageData, error: usageError } = await supabase
        .from('forecast_usage')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (usageError) throw usageError;

      // Aggregate by day
      const dailyStats = usageData.reduce((acc: Record<string, number>, item) => {
        const date = new Date(item.created_at).toLocaleDateString();
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      setDailyUsage(Object.entries(dailyStats).map(([date, count]) => ({ date, count })));

      // Get regional forecast data from usage + listings
      const { data: usageWithListings } = await supabase
        .from('forecast_usage')
        .select(`
          listing_id,
          listings!inner (
            region,
            listing_metrics (
              net_yield_pct,
              gross_yield_pct
            )
          )
        `)
        .eq('user_id', user.id)
        .not('listing_id', 'is', null)
        .limit(100);

      if (usageWithListings) {
        const regional = usageWithListings.reduce((acc: Record<string, { count: number; yieldSum: number; riskSum: number }>, item: any) => {
          const region = item.listings?.region || 'UK';
          const yield_pct = item.listings?.listing_metrics?.[0]?.net_yield_pct || 0;
          
          if (!acc[region]) {
            acc[region] = { count: 0, yieldSum: 0, riskSum: 0 };
          }
          acc[region].count++;
          acc[region].yieldSum += yield_pct;
          acc[region].riskSum += (10 - yield_pct); // Simple risk proxy: lower yield = higher risk
          return acc;
        }, {});

        setRegionalData(
          Object.entries(regional).map(([region, stats]) => ({
            region,
            count: stats.count,
            avgYield: stats.yieldSum / stats.count,
            avgRisk: stats.riskSum / stats.count
          }))
        );
      }
    } catch (error: any) {
      console.error('Failed to load telemetry:', error);
      toast.error('Failed to load AI telemetry');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !health) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Activity className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading telemetry...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            AI Telemetry & Analytics
          </h1>
          <p className="text-muted-foreground">Real-time monitoring of AI services and forecast performance</p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${
                  health.ai.status === 'healthy' ? 'bg-green-500' :
                  health.ai.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span className="text-2xl font-bold capitalize">{health.ai.status}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Latency: {health.ai.latency_ms}ms
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Today's Forecasts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{health.system.forecasts_today}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {health.user && health.user.quota_remaining !== -1 ? (
                  `${health.user.quota_remaining} remaining`
                ) : (
                  'Unlimited'
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Total Forecasts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{health.system.total_forecasts.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-2">All-time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {health.system.uptime_pct}%
              </div>
              <p className="text-xs text-muted-foreground mt-2">Last 30 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Forecast Usage</CardTitle>
              <CardDescription>Last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyUsage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Regional Distribution</CardTitle>
              <CardDescription>Forecast count by region</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={regionalData as any}
                    dataKey="count"
                    nameKey="region"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {regionalData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Average Yield by Region
              </CardTitle>
              <CardDescription>Predicted net yield (%)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={regionalData as any}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="region" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avgYield" fill="#10b981" name="Avg Yield %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Risk Indicator by Region
              </CardTitle>
              <CardDescription>Lower is better</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={regionalData as any}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="region" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avgRisk" fill="#f59e0b" name="Risk Score" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Model Version:</span>
              <span className="font-mono">{health.ai.model_version}</span>
            </div>
            {health.user && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Your Tier:</span>
                  <span className="font-semibold capitalize">{health.user.tier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly Usage:</span>
                  <span>{health.user.usage_month} forecasts</span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">API Endpoints:</span>
              <span className="text-xs font-mono">/forecast, /copilot-advisor, /forecast-portfolio</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
