import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, GraduationCap, Sparkles } from "lucide-react";
import { tutorials } from "@/lib/tutorials";
import { FeatureTutorial } from "./FeatureTutorial";

export function FirstTimeTutorialPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTutorial, setActiveTutorial] = useState<string | null>(null);

  useEffect(() => {
    // Check if user has seen the prompt or completed any tutorial
    const hasSeenPrompt = localStorage.getItem("yieldpilot_tutorial_prompt_seen");
    const completedTutorials = localStorage.getItem("yieldpilot_tutorials_completed");
    
    if (!hasSeenPrompt && !completedTutorials) {
      // Show after 2 seconds to let the page load
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleStartTutorial = () => {
    const firstTutorial = tutorials[0]; // Start with first property analysis tutorial
    setActiveTutorial(firstTutorial.id);
    setIsVisible(false);
    localStorage.setItem("yieldpilot_tutorial_prompt_seen", "true");
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("yieldpilot_tutorial_prompt_seen", "true");
  };

  const handleCompleteTutorial = () => {
    setActiveTutorial(null);
  };

  if (!isVisible && !activeTutorial) return null;

  const activeTutorialData = tutorials.find((t) => t.id === activeTutorial);

  return (
    <>
      {isVisible && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md animate-scale-in">
          <Card className="p-6 shadow-glow border-2 border-primary/50 bg-gradient-to-br from-background to-primary/5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    New to YieldPilot?
                    <Sparkles className="h-4 w-4 text-primary" />
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Take a quick guided tour
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleDismiss}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Learn how to analyze your first property in just 2 minutes. We'll walk you through each step with interactive guidance.
            </p>

            <div className="flex gap-3">
              <Button onClick={handleStartTutorial} className="flex-1 gap-2">
                <GraduationCap className="h-4 w-4" />
                Start Tutorial
              </Button>
              <Button variant="outline" onClick={handleDismiss}>
                Maybe Later
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-3 text-center">
              You can access tutorials anytime from the header menu
            </p>
          </Card>
        </div>
      )}

      {activeTutorialData && (
        <FeatureTutorial
          tutorial={activeTutorialData}
          onComplete={handleCompleteTutorial}
          onSkip={handleCompleteTutorial}
        />
      )}
    </>
  );
}
