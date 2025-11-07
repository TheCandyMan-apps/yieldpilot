import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Achievement, trackAchievementProgress } from "@/lib/achievements";
import { AchievementUnlockNotification } from "./AchievementUnlockNotification";

interface AchievementContextType {
  trackEvent: (eventType: string, eventTarget?: string) => Promise<void>;
}

const AchievementContext = createContext<AchievementContextType | null>(null);

export function useAchievements() {
  const context = useContext(AchievementContext);
  if (!context) {
    throw new Error("useAchievements must be used within AchievementProvider");
  }
  return context;
}

export function AchievementProvider({ children }: { children: ReactNode }) {
  const [unlockedAchievements, setUnlockedAchievements] = useState<Achievement[]>([]);

  const trackEvent = useCallback(async (eventType: string, eventTarget?: string) => {
    try {
      const newlyUnlocked = await trackAchievementProgress(eventType, eventTarget);
      if (newlyUnlocked.length > 0) {
        setUnlockedAchievements((prev) => [...prev, ...newlyUnlocked]);
      }
    } catch (error) {
      console.error("Failed to track achievement:", error);
    }
  }, []);

  const handleCloseNotification = (achievementId: string) => {
    setUnlockedAchievements((prev) =>
      prev.filter((a) => a.id !== achievementId)
    );
  };

  return (
    <AchievementContext.Provider value={{ trackEvent }}>
      {children}
      
      {/* Achievement unlock notifications */}
      {unlockedAchievements.map((achievement) => (
        <AchievementUnlockNotification
          key={achievement.id}
          achievement={achievement}
          onClose={() => handleCloseNotification(achievement.id)}
        />
      ))}
    </AchievementContext.Provider>
  );
}
