import { useState, useEffect } from 'react';
import { Users, Badge as BadgeIcon, Building, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface InvestorProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  bio: string | null;
  aum_range: string | null;
  investment_strategy: string | null;
  preferred_regions: any;
  min_yield_target: number | null;
  verified: boolean | null;
  reputation_score: number | null;
  badges: any;
  total_deals: number | null;
  successful_exits: number | null;
  visibility: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export function InvestorNetwork() {
  const [investors, setInvestors] = useState<InvestorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<InvestorProfile | null>(null);

  useEffect(() => {
    loadInvestors();
    loadMyProfile();
  }, []);

  const loadInvestors = async () => {
    try {
      const { data, error } = await supabase
        .from('investor_profiles')
        .select('*')
        .eq('visibility', 'public')
        .order('reputation_score', { ascending: false })
        .limit(20);

      if (error) throw error;
      setInvestors(data || []);
    } catch (error: any) {
      console.error('Failed to load investors:', error);
      toast.error('Failed to load investor network');
    } finally {
      setLoading(false);
    }
  };

  const loadMyProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('investor_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setMyProfile(data);
    } catch (error) {
      // Profile doesn't exist yet
    }
  };

  const createProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to create a profile');
        return;
      }

      const { error } = await supabase
        .from('investor_profiles')
        .insert({
          user_id: user.id,
          display_name: user.email?.split('@')[0] || 'Investor',
          visibility: 'public'
        });

      if (error) throw error;
      
      toast.success('Investor profile created!');
      loadMyProfile();
    } catch (error: any) {
      console.error('Failed to create profile:', error);
      toast.error('Failed to create profile');
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getAumLabel = (range: string) => {
    const labels: Record<string, string> = {
      under_100k: '< £100k',
      '100k_500k': '£100k - £500k',
      '500k_1m': '£500k - £1M',
      '1m_5m': '£1M - £5M',
      '5m_plus': '£5M+'
    };
    return labels[range] || range;
  };

  if (!myProfile) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle>Investor Network</CardTitle>
          </div>
          <CardDescription>Connect with verified property investors</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12 space-y-4">
          <Users className="h-16 w-16 text-muted-foreground mx-auto" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Join the Network</h3>
            <p className="text-muted-foreground mb-4">
              Create your investor profile to connect with others and discover co-investment opportunities
            </p>
            <Button onClick={createProfile}>
              Create Investor Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle>Investor Network</CardTitle>
          </div>
          <Badge variant="secondary">{investors.length} investors</Badge>
        </div>
        <CardDescription>Verified property investors in your network</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : investors.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No investors found
          </div>
        ) : (
          <div className="space-y-3">
            {investors.map((investor) => (
              <Card key={investor.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(investor.display_name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{investor.display_name}</h4>
                        {investor.verified && (
                          <Badge variant="secondary" className="gap-1">
                            <BadgeIcon className="h-3 w-3" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      
                      {investor.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {investor.bio}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 text-xs">
                        {investor.aum_range && (
                          <Badge variant="outline">
                            <Building className="h-3 w-3 mr-1" />
                            {getAumLabel(investor.aum_range)}
                          </Badge>
                        )}
                        {investor.min_yield_target && (
                          <Badge variant="outline">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {investor.min_yield_target}%+ yield
                          </Badge>
                        )}
                        <Badge variant="outline">
                          {investor.total_deals} deals
                        </Badge>
                      </div>

                      {investor.badges && investor.badges.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {investor.badges.map((badge, idx) => (
                            <span key={idx} className="text-xs">
                              {badge}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <Button size="sm" variant="outline">
                      Connect
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}