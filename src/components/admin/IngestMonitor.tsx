import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface ProviderStats {
  provider: string;
  total: number;
  succeeded: number;
  failed: number;
  pending: number;
  lastRun?: string;
  successRate: number;
}

export function IngestMonitor() {
  const [stats, setStats] = useState<ProviderStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const { data: jobs } = await supabase
        .from('ingest_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!jobs) return;

      const providerMap = new Map<string, ProviderStats>();
      
      for (const job of jobs) {
        const site = job.input_url || 'unknown';
        const provider = site.includes('zoopla') ? 'Zoopla' :
                        site.includes('rightmove') ? 'Rightmove' :
                        site.includes('zillow') ? 'Zillow' :
                        site.includes('realtor') ? 'Realtor' :
                        site.includes('redfin') ? 'Redfin' :
                        site.includes('idealista') ? 'Idealista' :
                        site.includes('immobilienscout') ? 'IS24' :
                        site.includes('seloger') ? 'SeLoger' : 'Unknown';

        if (!providerMap.has(provider)) {
          providerMap.set(provider, {
            provider,
            total: 0,
            succeeded: 0,
            failed: 0,
            pending: 0,
            successRate: 0,
          });
        }

        const stats = providerMap.get(provider)!;
        stats.total++;

        if (job.status === 'succeeded') stats.succeeded++;
        else if (job.status === 'failed') stats.failed++;
        else if (job.status === 'queued' || job.status === 'processing') stats.pending++;

        if (!stats.lastRun || new Date(job.created_at) > new Date(stats.lastRun)) {
          stats.lastRun = job.created_at;
        }
      }

      // Calculate success rates
      providerMap.forEach((stats) => {
        stats.successRate = stats.total > 0 ? (stats.succeeded / stats.total) * 100 : 0;
      });

      setStats(Array.from(providerMap.values()).sort((a, b) => b.total - a.total));
    } catch (error) {
      console.error('Failed to load ingest stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (rate: number) => {
    if (rate >= 90) return 'text-success';
    if (rate >= 70) return 'text-warning';
    return 'text-destructive';
  };

  if (loading) {
    return <div>Loading stats...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Ingestion Monitor</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.provider}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{stat.provider}</CardTitle>
              <CardDescription>
                {stat.lastRun ? new Date(stat.lastRun).toLocaleString() : 'Never'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Success Rate</span>
                <span className={`text-lg font-bold ${getStatusColor(stat.successRate)}`}>
                  {stat.successRate.toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span>{stat.succeeded}</span>
                </div>
                <div className="flex items-center gap-1">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span>{stat.failed}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{stat.pending}</span>
                </div>
              </div>
              {stat.successRate < 70 && (
                <Badge variant="destructive" className="w-full justify-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Needs Attention
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
