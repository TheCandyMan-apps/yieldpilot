import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface IngestJob {
  id: string;
  site: string;
  input_url: string;
  normalized_url: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'no_items' | 'canceled';
  run_id: string | null;
  dataset_id: string | null;
  listing_id: string | null;
  error: any;
  created_at: string;
  updated_at: string;
}

export function useJobQueue(jobId: string | null) {
  const [job, setJob] = useState<IngestJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    let mounted = true;
    let pollInterval: number;

    async function fetchJob() {
      try {
        const { data, error: fetchError } = await supabase
          .from('ingest_jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (fetchError) throw fetchError;
        
        if (mounted) {
          setJob(data as IngestJob);
          
          // Stop polling if job is in terminal state
          if (['succeeded', 'failed', 'no_items', 'canceled'].includes(data.status)) {
            clearInterval(pollInterval);
            setLoading(false);
          }
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message);
          setLoading(false);
          clearInterval(pollInterval);
        }
      }
    }

    setLoading(true);
    fetchJob();

    // Poll every 3 seconds for up to 2 minutes
    pollInterval = window.setInterval(fetchJob, 3000);
    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
      if (mounted) {
        setLoading(false);
        setError('Job polling timed out');
      }
    }, 120000);

    return () => {
      mounted = false;
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [jobId]);

  return { job, loading, error };
}

export async function queueIngest(url: string): Promise<{ jobId: string; status: string }> {
  const { data, error } = await supabase.functions.invoke('queue-ingest', {
    body: { url },
  });

  if (error) throw error;
  if (!data.ok) throw new Error(data.error || 'Failed to queue job');

  return { jobId: data.jobId, status: data.status };
}
