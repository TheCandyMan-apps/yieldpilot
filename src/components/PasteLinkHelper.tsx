import { useState } from 'react';
import { Link as LinkIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAdapterForUrl } from '@/lib/sources/registry';
import { detectMarketFromUrl, getMarket } from '@/lib/market';

export function PasteLinkHelper() {
  const [url, setUrl] = useState('');
  const [detected, setDetected] = useState<{
    adapter: string | null;
    market: string | null;
    supported: boolean;
  } | null>(null);

  const handleUrlChange = (value: string) => {
    setUrl(value);
    
    if (!value) {
      setDetected(null);
      return;
    }

    try {
      const adapter = getAdapterForUrl(value);
      const marketId = detectMarketFromUrl(value);
      const market = getMarket(marketId);

      setDetected({
        adapter: adapter?.displayName || null,
        market: market.name,
        supported: !!adapter,
      });
    } catch (error) {
      setDetected({
        adapter: null,
        market: null,
        supported: false,
      });
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <LinkIcon className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Import Property</h3>
      </div>
      
      <p className="text-sm text-muted-foreground">
        Paste a property URL from any supported listing site to automatically import and analyze it.
      </p>

      <div className="space-y-2">
        <Input
          type="url"
          placeholder="https://www.zoopla.co.uk/..."
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          className="font-mono text-sm"
        />

        {detected && (
          <div className="flex items-center gap-2 text-sm">
            {detected.supported ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-muted-foreground">Detected:</span>
                <Badge variant="secondary">{detected.adapter}</Badge>
                <Badge variant="outline">{detected.market}</Badge>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-muted-foreground">URL not recognized. Please use a supported site.</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="pt-2">
        <p className="text-xs text-muted-foreground mb-2">Supported sites:</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">🇬🇧 Zoopla</Badge>
          <Badge variant="outline">🇬🇧 Rightmove</Badge>
          <Badge variant="outline">🇺🇸 Zillow</Badge>
          <Badge variant="outline">🇺🇸 Realtor.com</Badge>
          <Badge variant="outline">🇺🇸 Redfin</Badge>
          <Badge variant="outline">🇩🇪 ImmobilienScout24</Badge>
          <Badge variant="outline">🇪🇸 Idealista</Badge>
          <Badge variant="outline">🇫🇷 SeLoger</Badge>
        </div>
      </div>

      <Button 
        className="w-full" 
        disabled={!detected?.supported || !url}
      >
        Import & Analyze
      </Button>
    </Card>
  );
}
