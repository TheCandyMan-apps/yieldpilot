import { useEffect, useState } from "react";
import { Achievement } from "@/lib/achievements";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";

interface AchievementUnlockNotificationProps {
  achievement: Achievement;
  onClose: () => void;
}

export function AchievementUnlockNotification({
  achievement,
  onClose,
}: AchievementUnlockNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const Icon = (LucideIcons as any)[achievement.icon] || LucideIcons.Award;

  useEffect(() => {
    // Trigger animation
    setTimeout(() => setIsVisible(true), 100);

    // Auto-close after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const categoryGradients = {
    tutorials: "from-blue-500 to-blue-600",
    analysis: "from-purple-500 to-purple-600",
    milestones: "from-green-500 to-green-600",
    social: "from-orange-500 to-orange-600",
    expert: "from-red-500 to-red-600",
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
      <Card
        className={cn(
          "pointer-events-auto w-80 shadow-2xl border-2 transition-all duration-300",
          isVisible
            ? "translate-y-0 opacity-100 scale-100"
            : "translate-y-4 opacity-0 scale-95"
        )}
      >
        {/* Animated background */}
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-10",
            categoryGradients[achievement.category]
          )}
        />
        
        {/* Sparkle animation */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="achievement-sparkle" />
          <div className="achievement-sparkle animation-delay-150" />
          <div className="achievement-sparkle animation-delay-300" />
        </div>

        <div className="relative p-6">
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <LucideIcons.X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-4">
            <div
              className={cn(
                "rounded-full p-3 bg-gradient-to-br text-white shadow-lg",
                categoryGradients[achievement.category]
              )}
            >
              <Icon size={32} />
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <LucideIcons.Trophy className="w-4 h-4 text-amber-500" />
                <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                  Achievement Unlocked!
                </p>
              </div>

              <div>
                <h3 className="font-bold text-lg">{achievement.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {achievement.description}
                </p>
              </div>

              {achievement.points > 0 && (
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                  +{achievement.points} points
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
