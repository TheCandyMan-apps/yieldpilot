import { supabase } from '@/integrations/supabase/client';

export type ActivityAction = 
  | 'deal_analyzed'
  | 'deal_shared'
  | 'syndicate_created'
  | 'benchmark_viewed'
  | 'forecast_generated'
  | 'document_uploaded'
  | 'profile_updated';

interface ActivityMetadata {
  deal_id?: string;
  listing_id?: string;
  yield?: number;
  score?: number;
  [key: string]: any;
}

export async function trackActivity(
  action: ActivityAction,
  metadata?: ActivityMetadata
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('user_activity')
      .insert({
        user_id: user.id,
        action_type: action,
        metadata: metadata || {}
      });
  } catch (error) {
    console.error('Failed to track activity:', error);
    // Don't throw - activity tracking shouldn't break user flows
  }
}

export async function calculateUserScore(userId: string): Promise<number> {
  try {
    const { data: activities, error } = await supabase
      .from('user_activity')
      .select('action_type, created_at')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

    if (error) throw error;

    let score = 0;
    activities?.forEach(activity => {
      switch (activity.action_type) {
        case 'deal_analyzed': score += 10; break;
        case 'syndicate_created': score += 25; break;
        case 'deal_shared': score += 5; break;
        case 'benchmark_viewed': score += 2; break;
        case 'forecast_generated': score += 8; break;
        case 'document_uploaded': score += 6; break;
        default: score += 1;
      }
    });

    return score;
  } catch (error) {
    console.error('Failed to calculate user score:', error);
    return 0;
  }
}

export async function updateReputationScore(userId: string): Promise<void> {
  try {
    const score = await calculateUserScore(userId);
    
    await supabase
      .from('investor_profiles')
      .update({ reputation_score: score })
      .eq('user_id', userId);
  } catch (error) {
    console.error('Failed to update reputation score:', error);
  }
}
