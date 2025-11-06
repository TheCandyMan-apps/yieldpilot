import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Clock, CheckCircle2, RotateCcw, GraduationCap } from "lucide-react";
import { tutorials, isTutorialCompleted, resetTutorial, resetAllTutorials } from "@/lib/tutorials";
import { FeatureTutorial } from "./FeatureTutorial";

const categoryLabels = {
  analysis: "Property Analysis",
  deals: "Deal Management",
  portfolio: "Portfolio Building",
  advanced: "Advanced Features",
};

const categoryColors = {
  analysis: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  deals: "bg-green-500/10 text-green-500 border-green-500/20",
  portfolio: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  advanced: "bg-orange-500/10 text-orange-500 border-orange-500/20",
};

export function TutorialMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTutorial, setActiveTutorial] = useState<string | null>(null);

  const handleStartTutorial = (tutorialId: string) => {
    setActiveTutorial(tutorialId);
    setIsOpen(false);
  };

  const handleCompleteTutorial = () => {
    setActiveTutorial(null);
  };

  const handleResetTutorial = (tutorialId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    resetTutorial(tutorialId);
    setIsOpen(false);
    // Reopen to refresh state
    setTimeout(() => setIsOpen(true), 100);
  };

  const handleResetAll = () => {
    resetAllTutorials();
    setIsOpen(false);
    setTimeout(() => setIsOpen(true), 100);
  };

  const completedCount = tutorials.filter((t) => isTutorialCompleted(t.id)).length;
  const totalCount = tutorials.length;

  const activeTutorialData = tutorials.find((t) => t.id === activeTutorial);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <GraduationCap className="h-4 w-4" />
            Tutorials
            {completedCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {completedCount}/{totalCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Interactive Tutorials
            </SheetTitle>
            <SheetDescription>
              Learn YieldPilot features with step-by-step guided walkthroughs
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Progress summary */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Your Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {completedCount} of {totalCount} completed
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all duration-500"
                    style={{ width: `${(completedCount / totalCount) * 100}%` }}
                  />
                </div>
                {completedCount === totalCount && (
                  <p className="text-xs text-primary mt-2 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    All tutorials completed! 🎉
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Tutorial categories */}
            {Object.entries(categoryLabels).map(([category, label]) => {
              const categoryTutorials = tutorials.filter((t) => t.category === category);
              if (categoryTutorials.length === 0) return null;

              return (
                <div key={category} className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {label}
                  </h3>
                  <div className="space-y-2">
                    {categoryTutorials.map((tutorial) => {
                      const isCompleted = isTutorialCompleted(tutorial.id);
                      return (
                        <Card
                          key={tutorial.id}
                          className="cursor-pointer hover:border-primary/50 transition-colors group"
                          onClick={() => handleStartTutorial(tutorial.id)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-base flex items-center gap-2">
                                  {tutorial.title}
                                  {isCompleted && (
                                    <CheckCircle2 className="h-4 w-4 text-success" />
                                  )}
                                </CardTitle>
                                <CardDescription className="text-sm mt-1">
                                  {tutorial.description}
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <Badge
                                variant="outline"
                                className={categoryColors[category as keyof typeof categoryColors]}
                              >
                                {label}
                              </Badge>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {tutorial.estimatedMinutes} min
                              </div>
                              <div className="flex items-center gap-1">
                                <BookOpen className="h-3 w-3" />
                                {tutorial.steps.length} steps
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                              <Button
                                size="sm"
                                variant={isCompleted ? "outline" : "default"}
                                className="flex-1 group-hover:bg-primary group-hover:text-primary-foreground"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartTutorial(tutorial.id);
                                }}
                              >
                                {isCompleted ? "Review Tutorial" : "Start Tutorial"}
                              </Button>
                              {isCompleted && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => handleResetTutorial(tutorial.id, e)}
                                >
                                  <RotateCcw className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Reset all button */}
            {completedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetAll}
                className="w-full gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset All Progress
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Active tutorial */}
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
