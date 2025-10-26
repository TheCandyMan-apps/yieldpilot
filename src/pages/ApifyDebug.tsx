import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, XCircle, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function ApifyDebug() {
  const [token, setToken] = useState('');
  const [actorId, setActorId] = useState('apifytech/rightmove-scraper');
  const [runData, setRunData] = useState<any>(null);
  const [datasetItems, setDatasetItems] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorDetails, setErrorDetails] = useState<string>('');

  const testConnection = async () => {
    if (!token) {
      toast.error('Please enter an Apify token');
      return;
    }

    setLoading(true);
    setConnectionStatus('idle');
    setErrorDetails('');
    setRunData(null);
    setDatasetItems(null);

    try {
      // Test basic API connectivity
      const testResponse = await fetch('https://api.apify.com/v2/actor-tasks', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!testResponse.ok) {
        if (testResponse.status === 401) {
          setConnectionStatus('error');
          setErrorDetails('Invalid or expired Apify token');
          toast.error('Invalid Apify token');
          return;
        }
        throw new Error(`API returned ${testResponse.status}`);
      }

      setConnectionStatus('success');
      toast.success('Successfully connected to Apify API');
    } catch (error: any) {
      setConnectionStatus('error');
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        setErrorDetails('Cannot reach api.apify.com - likely blocked by VPN or firewall');
        toast.error('Network error: Check VPN settings');
      } else {
        setErrorDetails(error.message);
        toast.error('Connection failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const startRun = async () => {
    if (!token) {
      toast.error('Please enter an Apify token');
      return;
    }

    setLoading(true);
    setRunData(null);
    setDatasetItems(null);

    try {
      // Start actor run
      const runResponse = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maxItems: 5,
          startUrls: [{ url: 'https://www.rightmove.co.uk/properties/123456789' }],
        }),
      });

      if (!runResponse.ok) {
        const errorText = await runResponse.text();
        throw new Error(`Failed to start run: ${runResponse.status} - ${errorText}`);
      }

      const runInfo = await runResponse.json();
      setRunData(runInfo);
      toast.success('Run started successfully');

      // Poll for completion
      await pollRunCompletion(runInfo.data.id);
    } catch (error: any) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        setErrorDetails('Cannot reach api.apify.com - likely blocked by VPN or firewall');
        toast.error('Network error: Check VPN settings');
      } else {
        toast.error(`Error: ${error.message}`);
        setErrorDetails(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const pollRunCompletion = async (runId: string) => {
    const maxAttempts = 60;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const statusResponse = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const statusData = await statusResponse.json();
        const status = statusData.data.status;

        if (status === 'SUCCEEDED') {
          toast.success('Run completed successfully');
          await fetchDatasetItems(statusData.data.defaultDatasetId);
          break;
        } else if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
          toast.error(`Run ${status.toLowerCase()}`);
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      } catch (error: any) {
        console.error('Polling error:', error);
        break;
      }
    }
  };

  const fetchDatasetItems = async (datasetId: string) => {
    try {
      const datasetResponse = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const items = await datasetResponse.json();
      setDatasetItems(items);

      if (!items || items.length === 0) {
        toast.warning('Run succeeded but returned no items');
      }
    } catch (error: any) {
      toast.error(`Failed to fetch dataset: ${error.message}`);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Apify Debug Console</h1>

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertTitle>VPN & Network Issues</AlertTitle>
        <AlertDescription>
          <p className="mb-2">
            If you're on ProtonVPN or similar VPN services, they may block api.apify.com.
          </p>
          <p className="mb-2">
            <strong>Solutions:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Allowlist api.apify.com in your VPN settings</li>
            <li>Use the server-side edge function instead (recommended)</li>
            <li>Temporarily disable VPN when testing Apify integration</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Connection Test</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Apify Token</label>
            <Input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter your Apify API token"
              className="font-mono"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Get your token from: https://console.apify.com/account/integrations
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Actor ID</label>
            <Input
              value={actorId}
              onChange={(e) => setActorId(e.target.value)}
              placeholder="apifytech/rightmove-scraper"
            />
          </div>

          <div className="flex gap-4">
            <Button
              onClick={testConnection}
              disabled={loading || !token}
              variant="outline"
            >
              Test Connection
            </Button>
            <Button
              onClick={startRun}
              disabled={loading || !token || connectionStatus !== 'success'}
            >
              {loading ? 'Running...' : 'Start Test Run'}
            </Button>
          </div>

          {connectionStatus !== 'idle' && (
            <Alert variant={connectionStatus === 'success' ? 'default' : 'destructive'}>
              {connectionStatus === 'success' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {connectionStatus === 'success' ? 'Connected' : 'Connection Failed'}
              </AlertTitle>
              {errorDetails && (
                <AlertDescription>{errorDetails}</AlertDescription>
              )}
            </Alert>
          )}
        </div>
      </Card>

      {runData && (
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Run Data</h2>
          <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96 text-xs">
            {JSON.stringify(runData, null, 2)}
          </pre>
        </Card>
      )}

      {datasetItems && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            Dataset Items ({Array.isArray(datasetItems) ? datasetItems.length : 0})
          </h2>
          {Array.isArray(datasetItems) && datasetItems.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Items Found</AlertTitle>
              <AlertDescription>
                The run completed but returned 0 items. Check:
                <ul className="list-disc list-inside mt-2">
                  <li>Actor configuration (maxItems, startUrls)</li>
                  <li>Target website availability</li>
                  <li>Actor logs in Apify console</li>
                </ul>
              </AlertDescription>
            </Alert>
          ) : (
            <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96 text-xs">
              {JSON.stringify(datasetItems, null, 2)}
            </pre>
          )}
        </Card>
      )}
    </div>
  );
}
