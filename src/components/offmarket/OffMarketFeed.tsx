import { useState, useEffect } from 'react';
import { Lock, MapPin, TrendingUp, Calendar, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/fx';

interface OffMarketLead {
  id: string;
  address_line1: string;
  postcode: string;
  city: string;
  region: string;
  property_type: string;
  bedrooms: number;
  estimated_value: number;
  currency: string;
  lead_source: string;
  lead_score: number;
  discovered_at: string;
}

export function OffMarketFeed() {
  const [leads, setLeads] = useState<OffMarketLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [postcode, setPostcode] = useState('');
  const [region, setRegion] = useState('UK');
  const [minScore, setMinScore] = useState(50);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    loadLeads();
  }, [region, minScore]);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('offmarket', {
        body: { region, postcode: postcode || undefined, minScore }
      });

      if (error) {
        if (error.message?.includes('Premium')) {
          setIsPremium(false);
          toast.error('Premium subscription required for off-market leads');
          return;
        }
        throw error;
      }

      setLeads(data.leads || []);
      setIsPremium(data.premium);
    } catch (error: any) {
      console.error('Failed to load off-market leads:', error);
      toast.error('Failed to load off-market leads');
    } finally {
      setLoading(false);
    }
  };

  const getSourceBadge = (source: string) => {
    const badges: Record<string, { label: string; variant: any }> = {
      auction: { label: 'Auction', variant: 'default' },
      planning: { label: 'Planning Approved', variant: 'secondary' },
      hmo_register: { label: 'HMO Register', variant: 'outline' },
      withdrawn: { label: 'Recently Withdrawn', variant: 'destructive' }
    };
    return badges[source] || { label: source, variant: 'outline' };
  };

  if (!isPremium && !loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <CardTitle>Off-Market Intelligence</CardTitle>
          </div>
          <CardDescription>Discover properties before they list</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12 space-y-4">
          <Lock className="h-16 w-16 text-muted-foreground mx-auto" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Premium Feature</h3>
            <p className="text-muted-foreground mb-4">
              Unlock off-market leads including auctions, planning approvals, and withdrawn listings
            </p>
            <Button onClick={() => window.location.href = '/billing'}>
              Upgrade to Pro
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle>Off-Market Intelligence</CardTitle>
          <Badge variant="secondary">Premium</Badge>
        </div>
        <CardDescription>Properties before they hit the market</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-2">
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UK">🇬🇧 UK</SelectItem>
              <SelectItem value="US">🇺🇸 US</SelectItem>
              <SelectItem value="DE">🇩🇪 DE</SelectItem>
              <SelectItem value="ES">🇪🇸 ES</SelectItem>
            </SelectContent>
          </Select>
          
          <Input
            placeholder="Postcode..."
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            className="flex-1"
          />
          
          <Button onClick={loadLeads} size="icon" variant="outline">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* Leads list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No off-market leads found for this area
          </div>
        ) : (
          <div className="space-y-3">
            {leads.map((lead) => {
              const source = getSourceBadge(lead.lead_source);
              return (
                <Card key={lead.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{lead.address_line1}</h4>
                          <Badge variant={source.variant}>{source.label}</Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {lead.postcode}
                          </div>
                          {lead.bedrooms && (
                            <span>{lead.bedrooms} bed</span>
                          )}
                          {lead.property_type && (
                            <span>{lead.property_type}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Est. Value:</span>
                          <span className="font-medium">
                            {formatCurrency(lead.estimated_value, lead.currency)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right space-y-2">
                        <Badge variant="outline" className="font-mono">
                          Score: {lead.lead_score}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {new Date(lead.discovered_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {leads.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Showing {leads.length} off-market opportunities
          </p>
        )}
      </CardContent>
    </Card>
  );
}