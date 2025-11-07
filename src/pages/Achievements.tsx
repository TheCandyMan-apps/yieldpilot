import { AchievementShowcase } from "@/components/gamification/AchievementShowcase";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Achievements() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container py-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>
      </div>

      <div className="container py-8">
        <div className="space-y-4 mb-8">
          <h1 className="text-4xl font-bold">Achievements</h1>
          <p className="text-lg text-muted-foreground">
            Track your progress and unlock badges as you explore features and complete tutorials
          </p>
        </div>

        <AchievementShowcase />
      </div>
    </div>
  );
}
