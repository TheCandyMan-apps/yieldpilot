import { Achievement } from "@/lib/achievements";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";

interface AchievementBadgeProps {
  achievement: Achievement;
  unlocked: boolean;
  size?: "sm" | "md" | "lg";
  showPoints?: boolean;
  className?: string;
}

export function AchievementBadge({
  achievement,
  unlocked,
  size = "md",
  showPoints = true,
  className,
}: AchievementBadgeProps) {
  const Icon = (LucideIcons as any)[achievement.icon] || LucideIcons.Award;

  const sizeClasses = {
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };

  const iconSizes = {
    sm: 20,
    md: 32,
    lg: 48,
  };

  const categoryColors = {
    tutorials: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    analysis: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    milestones: "bg-green-500/10 text-green-600 dark:text-green-400",
    social: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    expert: "bg-red-500/10 text-red-600 dark:text-red-400",
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all",
        sizeClasses[size],
        unlocked
          ? "bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20"
          : "bg-muted/50 opacity-60 grayscale",
        className
      )}
    >
      <div className="flex flex-col items-center text-center gap-3">
        <div
          className={cn(
            "rounded-full p-3 transition-all",
            unlocked ? categoryColors[achievement.category] : "bg-muted"
          )}
        >
          <Icon
            size={iconSizes[size]}
            className={unlocked ? "" : "text-muted-foreground"}
          />
        </div>

        <div className="space-y-1">
          <h3 className={cn(
            "font-semibold",
            size === "sm" && "text-sm",
            size === "md" && "text-base",
            size === "lg" && "text-lg"
          )}>
            {achievement.title}
          </h3>
          <p className="text-xs text-muted-foreground">
            {achievement.description}
          </p>
        </div>

        {showPoints && achievement.points > 0 && (
          <Badge variant={unlocked ? "default" : "secondary"} className="text-xs">
            {achievement.points} pts
          </Badge>
        )}

        {!unlocked && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] flex items-center justify-center">
            <LucideIcons.Lock className="w-6 h-6 text-muted-foreground" />
          </div>
        )}

        {unlocked && (
          <div className="absolute top-2 right-2">
            <LucideIcons.CheckCircle2 className="w-5 h-5 text-primary fill-primary" />
          </div>
        )}
      </div>
    </Card>
  );
}
