import { useEffect, useState } from "react";
import { Achievement, achievements, getUserAchievements, getTotalPoints, AchievementCategory } from "@/lib/achievements";
import { AchievementBadge } from "./AchievementBadge";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Trophy, Target } from "lucide-react";

export function AchievementShowcase() {
  const [unlockedAchievements, setUnlockedAchievements] = useState<Achievement[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      const unlocked = await getUserAchievements();
      const points = await getTotalPoints();
      setUnlockedAchievements(unlocked);
      setTotalPoints(points);
    } catch (error) {
      console.error("Failed to load achievements:", error);
    } finally {
      setLoading(false);
    }
  };

  const unlockedIds = new Set(unlockedAchievements.map((a) => a.id));
  const progress = (unlockedAchievements.length / achievements.length) * 100;

  const categories: { value: AchievementCategory; label: string }[] = [
    { value: "tutorials", label: "Tutorials" },
    { value: "analysis", label: "Analysis" },
    { value: "milestones", label: "Milestones" },
    { value: "social", label: "Social" },
    { value: "expert", label: "Expert" },
  ];

  if (loading) {
    return (
      <div className="container py-8">
        <div className="text-center">Loading achievements...</div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Trophy className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Points</p>
              <p className="text-2xl font-bold">{totalPoints}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-accent/10">
              <Target className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Achievements</p>
              <p className="text-2xl font-bold">
                {unlockedAchievements.length}/{achievements.length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </Card>
      </div>

      {/* Achievement Grid */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All</TabsTrigger>
          {categories.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value}>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {achievements.map((achievement) => (
              <AchievementBadge
                key={achievement.id}
                achievement={achievement}
                unlocked={unlockedIds.has(achievement.id)}
              />
            ))}
          </div>
        </TabsContent>

        {categories.map((cat) => (
          <TabsContent key={cat.value} value={cat.value} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {achievements
                .filter((a) => a.category === cat.value)
                .map((achievement) => (
                  <AchievementBadge
                    key={achievement.id}
                    achievement={achievement}
                    unlocked={unlockedIds.has(achievement.id)}
                  />
                ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
