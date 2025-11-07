import { supabase } from "@/integrations/supabase/client";

export type AchievementCategory = "tutorials" | "analysis" | "milestones" | "social" | "expert";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  icon: string; // Lucide icon name
  points: number;
  requirement: {
    type: "tutorial_complete" | "feature_usage" | "milestone" | "streak";
    target?: string; // tutorial id, feature name, etc.
    count?: number; // for cumulative achievements
  };
}

export const achievements: Achievement[] = [
  // Tutorial achievements
  {
    id: "first_steps",
    title: "First Steps",
    description: "Complete your first tutorial",
    category: "tutorials",
    icon: "GraduationCap",
    points: 10,
    requirement: { type: "tutorial_complete", count: 1 },
  },
  {
    id: "quick_learner",
    title: "Quick Learner",
    description: "Complete 3 tutorials",
    category: "tutorials",
    icon: "BookOpen",
    points: 25,
    requirement: { type: "tutorial_complete", count: 3 },
  },
  {
    id: "tutorial_master",
    title: "Tutorial Master",
    description: "Complete all tutorials",
    category: "tutorials",
    icon: "Trophy",
    points: 100,
    requirement: { type: "tutorial_complete", count: 5 },
  },
  
  // Analysis achievements
  {
    id: "first_analysis",
    title: "First Analysis",
    description: "Analyze your first property",
    category: "analysis",
    icon: "Search",
    points: 15,
    requirement: { type: "feature_usage", target: "property_analysis", count: 1 },
  },
  {
    id: "deal_hunter",
    title: "Deal Hunter",
    description: "Analyze 10 properties",
    category: "analysis",
    icon: "Target",
    points: 50,
    requirement: { type: "feature_usage", target: "property_analysis", count: 10 },
  },
  {
    id: "roi_expert",
    title: "ROI Expert",
    description: "Use the ROI calculator 20 times",
    category: "analysis",
    icon: "Calculator",
    points: 40,
    requirement: { type: "feature_usage", target: "roi_calculator", count: 20 },
  },
  
  // Milestone achievements
  {
    id: "first_save",
    title: "Collector",
    description: "Save your first deal",
    category: "milestones",
    icon: "Star",
    points: 10,
    requirement: { type: "feature_usage", target: "deal_saved", count: 1 },
  },
  {
    id: "portfolio_starter",
    title: "Portfolio Starter",
    description: "Create your first portfolio",
    category: "milestones",
    icon: "Briefcase",
    points: 30,
    requirement: { type: "feature_usage", target: "portfolio_created", count: 1 },
  },
  {
    id: "export_pro",
    title: "Export Pro",
    description: "Export 5 property reports",
    category: "milestones",
    icon: "Download",
    points: 25,
    requirement: { type: "feature_usage", target: "pdf_export", count: 5 },
  },
  
  // Social achievements
  {
    id: "networker",
    title: "Networker",
    description: "Share a deal with others",
    category: "social",
    icon: "Share2",
    points: 20,
    requirement: { type: "feature_usage", target: "deal_shared", count: 1 },
  },
  {
    id: "collaborator",
    title: "Collaborator",
    description: "Create a syndicate",
    category: "social",
    icon: "Users",
    points: 50,
    requirement: { type: "feature_usage", target: "syndicate_created", count: 1 },
  },
  
  // Expert achievements
  {
    id: "week_streak",
    title: "Consistent Investor",
    description: "Use the platform for 7 days in a row",
    category: "expert",
    icon: "Flame",
    points: 75,
    requirement: { type: "streak", count: 7 },
  },
  {
    id: "power_user",
    title: "Power User",
    description: "Reach 500 total points",
    category: "expert",
    icon: "Zap",
    points: 0, // Meta achievement
    requirement: { type: "milestone", target: "total_points", count: 500 },
  },
];

// Achievement tracking state
const STORAGE_KEY = "yieldpilot_achievement_progress";

interface AchievementProgress {
  [achievementId: string]: {
    progress: number;
    unlocked: boolean;
    unlockedAt?: string;
  };
}

// Get local progress (for non-authenticated users)
export function getLocalProgress(): AchievementProgress {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// Save local progress
function saveLocalProgress(progress: AchievementProgress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

// Track achievement progress
export async function trackAchievementProgress(
  eventType: string,
  eventTarget?: string
): Promise<Achievement[]> {
  const newlyUnlocked: Achievement[] = [];
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  // Find relevant achievements
  const relevantAchievements = achievements.filter(
    (achievement) =>
      (achievement.requirement.type === "feature_usage" &&
        achievement.requirement.target === eventTarget) ||
      (achievement.requirement.type === "tutorial_complete" && eventType === "tutorial_complete")
  );

  if (user) {
    // Database tracking for authenticated users
    for (const achievement of relevantAchievements) {
      const { data: existing } = await supabase
        .from("user_achievements")
        .select("*")
        .eq("user_id", user.id)
        .eq("achievement_id", achievement.id)
        .single();

      if (!existing) {
        // Check if requirement is met
        const { count } = await supabase
          .from("user_activity")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("action_type", eventTarget || "tutorial_complete");

        const currentCount = count || 0;
        const requiredCount = achievement.requirement.count || 1;

        if (currentCount >= requiredCount) {
          // Unlock achievement
          await supabase.from("user_achievements").insert({
            user_id: user.id,
            achievement_id: achievement.id,
            progress: 100,
            metadata: { earned_at: new Date().toISOString() },
          });
          newlyUnlocked.push(achievement);
        }
      }
    }
  } else {
    // Local tracking for anonymous users
    const progress = getLocalProgress();
    
    for (const achievement of relevantAchievements) {
      if (!progress[achievement.id]?.unlocked) {
        const currentProgress = progress[achievement.id]?.progress || 0;
        const newProgress = currentProgress + 1;
        const requiredCount = achievement.requirement.count || 1;

        progress[achievement.id] = {
          progress: newProgress,
          unlocked: newProgress >= requiredCount,
          unlockedAt: newProgress >= requiredCount ? new Date().toISOString() : undefined,
        };

        if (newProgress >= requiredCount) {
          newlyUnlocked.push(achievement);
        }
      }
    }
    
    saveLocalProgress(progress);
  }

  return newlyUnlocked;
}

// Get user's unlocked achievements
export async function getUserAchievements(): Promise<Achievement[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    const { data } = await supabase
      .from("user_achievements")
      .select("achievement_id")
      .eq("user_id", user.id);

    const unlockedIds = new Set(data?.map((a) => a.achievement_id) || []);
    return achievements.filter((a) => unlockedIds.has(a.id));
  } else {
    const progress = getLocalProgress();
    return achievements.filter((a) => progress[a.id]?.unlocked);
  }
}

// Calculate total points
export async function getTotalPoints(): Promise<number> {
  const unlocked = await getUserAchievements();
  return unlocked.reduce((sum, achievement) => sum + achievement.points, 0);
}

// Get achievement by id
export function getAchievement(id: string): Achievement | undefined {
  return achievements.find((a) => a.id === id);
}

// Get achievements by category
export function getAchievementsByCategory(category: AchievementCategory): Achievement[] {
  return achievements.filter((a) => a.category === category);
}
