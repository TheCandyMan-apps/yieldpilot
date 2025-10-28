import { useState } from 'react';
import { Trophy, TrendingUp, Star, Award, Medal, Crown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  points: number;
  rank: number;
  deals_analyzed: number;
  avg_yield: number;
  badges: string[];
}

export default function Leaderboard() {
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('month');

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['leaderboard', period],
    queryFn: async () => {
      // Fetch top users by activity
      const { data: activities, error } = await supabase
        .from('user_activity')
        .select('user_id, action_type, created_at, metadata')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      // Aggregate points by user
      const userPoints = new Map<string, { points: number; deals: number; yields: number[] }>();

      activities?.forEach(activity => {
        const current = userPoints.get(activity.user_id) || { points: 0, deals: 0, yields: [] };
        
        switch (activity.action_type) {
          case 'deal_analyzed':
            current.points += 10;
            current.deals += 1;
            if (activity.metadata && typeof activity.metadata === 'object' && 'yield' in activity.metadata) {
              const yieldVal = (activity.metadata as any).yield;
              if (typeof yieldVal === 'number') {
                current.yields.push(yieldVal);
              }
            }
            break;
          case 'deal_shared':
            current.points += 5;
            break;
          case 'syndicate_created':
            current.points += 25;
            break;
          case 'benchmark_viewed':
            current.points += 2;
            break;
        }
        
        userPoints.set(activity.user_id, current);
      });

      // Convert to array and sort
      const entries = Array.from(userPoints.entries())
        .map(([user_id, data], index) => ({
          user_id,
          display_name: `Investor ${user_id.slice(0, 6)}`,
          points: data.points,
          rank: index + 1,
          deals_analyzed: data.deals,
          avg_yield: data.yields.length > 0 
            ? data.yields.reduce((a, b) => a + b, 0) / data.yields.length 
            : 0,
          badges: getBadges(data.points, data.deals),
        }))
        .sort((a, b) => b.points - a.points)
        .slice(0, 50);

      return entries;
    },
  });

  const getBadges = (points: number, deals: number): string[] => {
    const badges: string[] = [];
    if (points >= 1000) badges.push('🏆 Legend');
    else if (points >= 500) badges.push('⭐ Expert');
    else if (points >= 250) badges.push('🎯 Pro');
    if (deals >= 100) badges.push('📊 Analyzer');
    if (deals >= 50) badges.push('🔍 Scout');
    return badges;
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2: return <Medal className="h-5 w-5 text-gray-400" />;
      case 3: return <Medal className="h-5 w-5 text-amber-600" />;
      default: return <span className="text-muted-foreground">#{rank}</span>;
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Trophy className="h-8 w-8 text-yellow-500" />
          <div>
            <h1 className="text-3xl font-bold">Yield Hunters Leaderboard</h1>
            <p className="text-muted-foreground">Top property investors this month</p>
          </div>
        </div>

        <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
          <TabsList>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
            <TabsTrigger value="all">All Time</TabsTrigger>
          </TabsList>

          <TabsContent value={period} className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : leaderboard && leaderboard.length > 0 ? (
              <div className="space-y-3">
                {leaderboard.map((entry) => (
                  <Card key={entry.user_id} className={entry.rank <= 3 ? 'border-primary' : ''}>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12">
                          {getRankIcon(entry.rank)}
                        </div>

                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {entry.display_name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{entry.display_name}</h3>
                            {entry.badges.map((badge, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {badge}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{entry.deals_analyzed} deals analyzed</span>
                            {entry.avg_yield > 0 && (
                              <span className="flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                {entry.avg_yield.toFixed(1)}% avg yield
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">
                            {entry.points.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">points</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No activity yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Start analyzing deals to earn points!
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle>How to Earn Points</CardTitle>
            <CardDescription>Level up by being active on YieldPilot</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Analyze a deal</span>
              <Badge variant="outline">+10 pts</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Create investment syndicate</span>
              <Badge variant="outline">+25 pts</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Share deal with network</span>
              <Badge variant="outline">+5 pts</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>View market benchmarks</span>
              <Badge variant="outline">+2 pts</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
