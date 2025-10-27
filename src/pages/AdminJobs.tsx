import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw, ExternalLink, Copy, RotateCcw, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface IngestJob {
  id: string;
  site: string;
  input_url: string;
  normalized_url: string;
  status: string;
  run_id: string | null;
  dataset_id: string | null;
  listing_id: string | null;
  error: any;
  created_at: string;
  updated_at: string;
}

interface SystemHealth {
  queued: number;
  running: number;
  succeeded: number;
  failed: number;
  avgTimeToSuccess: number;
}

export default function AdminJobs() {
  const [jobs, setJobs] = useState<IngestJob[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAccess();
    fetchJobs();
    fetchSystemHealth();
  }, [statusFilter, siteFilter]);

  async function checkAdminAccess() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = '/auth';
      return;
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roles) {
      toast({
        title: 'Access Denied',
        description: 'You do not have admin privileges',
        variant: 'destructive',
      });
      window.location.href = '/';
    }
  }

  async function fetchJobs() {
    setLoading(true);
    let query = supabase
      .from('ingest_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    if (siteFilter !== 'all') {
      query = query.eq('site', siteFilter);
    }

    const { data, error } = await query;

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setJobs(data || []);
    }
    setLoading(false);
  }

  async function fetchSystemHealth() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data } = await supabase
      .from('ingest_jobs')
      .select('status, created_at, updated_at')
      .gte('created_at', oneHourAgo);

    if (data) {
      const queued = data.filter(j => j.status === 'queued').length;
      const running = data.filter(j => j.status === 'running').length;
      const succeeded = data.filter(j => j.status === 'succeeded').length;
      const failed = data.filter(j => j.status === 'failed').length;

      const successJobs = data.filter(j => j.status === 'succeeded');
      const avgTime = successJobs.length > 0
        ? successJobs.reduce((acc, j) => {
            const duration = new Date(j.updated_at).getTime() - new Date(j.created_at).getTime();
            return acc + duration;
          }, 0) / successJobs.length / 1000
        : 0;

      setHealth({ queued, running, succeeded, failed, avgTimeToSuccess: avgTime });
    }
  }

  async function retryJob(jobId: string) {
    const { error } = await supabase
      .from('ingest_jobs')
      .update({ status: 'queued', error: null, updated_at: new Date().toISOString() })
      .eq('id', jobId);

    if (error) {
      toast({
        title: 'Retry Failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Job Requeued', description: 'Job has been added back to the queue' });
      fetchJobs();
    }
  }

  async function cancelJob(jobId: string) {
    const { error } = await supabase
      .from('ingest_jobs')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('id', jobId);

    if (error) {
      toast({
        title: 'Cancel Failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Job Canceled' });
      fetchJobs();
    }
  }

  function copyDiagnostics(job: IngestJob) {
    const diagnostics = {
      jobId: job.id,
      runId: job.run_id,
      datasetId: job.dataset_id,
      status: job.status,
      error: job.error,
    };
    navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
    toast({ title: 'Diagnostics Copied' });
  }

  const filteredJobs = jobs.filter(job =>
    job.input_url.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.normalized_url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued': return 'bg-blue-500';
      case 'running': return 'bg-yellow-500';
      case 'succeeded': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'no_items': return 'bg-orange-500';
      case 'canceled': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Ingestion Jobs Admin</h1>
          <Button onClick={fetchJobs} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* System Health */}
        {health && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">System Health (Last Hour)</h2>
            <div className="grid grid-cols-5 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-blue-600">{health.queued}</div>
                <div className="text-sm text-muted-foreground">Queued</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-yellow-600">{health.running}</div>
                <div className="text-sm text-muted-foreground">Running</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600">{health.succeeded}</div>
                <div className="text-sm text-muted-foreground">Succeeded</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-red-600">{health.failed}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{health.avgTimeToSuccess.toFixed(1)}s</div>
                <div className="text-sm text-muted-foreground">Avg Success Time</div>
              </div>
            </div>
          </Card>
        )}

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Search by URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="succeeded">Succeeded</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="no_items">No Items</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={siteFilter} onValueChange={setSiteFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by site" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sites</SelectItem>
                <SelectItem value="zoopla">Zoopla</SelectItem>
                <SelectItem value="rightmove">Rightmove</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Jobs Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Run ID</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : filteredJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">No jobs found</TableCell>
                </TableRow>
              ) : (
                filteredJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="text-sm">
                      {format(new Date(job.created_at), 'MMM d, HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{job.site}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={job.input_url}>
                      {job.input_url}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(job.status)}>
                        {job.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {job.run_id ? (
                        <a
                          href={`https://console.apify.com/view/runs/${job.run_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          {job.run_id.slice(0, 8)}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyDiagnostics(job)}
                          title="Copy diagnostics"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {['failed', 'no_items', 'canceled'].includes(job.status) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => retryJob(job.id)}
                            title="Retry"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        {['queued', 'running'].includes(job.status) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => cancelJob(job.id)}
                            title="Cancel"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {job.listing_id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(`/deals/${job.listing_id}`, '_blank')}
                            title="View listing"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  );
}
