import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface TourStep {
  title: string;
  description: string;
  target?: string; // CSS selector
  position?: "top" | "bottom" | "left" | "right";
}

const tourSteps: TourStep[] = [
  {
    title: "Welcome to YieldPilot! 🎉",
    description: "Let's take a quick tour to get you started with finding and analyzing profitable property deals.",
  },
  {
    title: "Dashboard Overview",
    description: "Your dashboard shows key metrics, recent deals, and quick actions. Everything you need at a glance.",
    target: ".dashboard-main",
  },
  {
    title: "Search Properties",
    description: "Use Cmd+K to quickly search across all your deals, portfolios, and insights.",
    target: ".global-search",
  },
  {
    title: "AI Copilot",
    description: "Ask questions about any property and get instant AI-powered insights. Click the sparkle icon on any deal.",
  },
  {
    title: "Forecasts & Analytics",
    description: "Generate AI-powered yield forecasts and market predictions. Check your usage in the sidebar.",
    target: ".forecast-usage",
  },
  {
    title: "You're All Set!",
    description: "Start by analyzing your first property. Paste a listing URL or explore sample deals.",
  },
];

export function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if user has seen the tour
    const hasSeenTour = localStorage.getItem("yieldpilot_tour_completed");
    if (!hasSeenTour) {
      setIsOpen(true);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem("yieldpilot_tour_completed", "true");
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const step = tourSteps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === tourSteps.length - 1;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" />

      {/* Tour Card */}
      <Card className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">{step.title}</h3>
            <p className="text-sm text-muted-foreground">{step.description}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSkip}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2">
          {tourSteps.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                index === currentStep
                  ? "bg-primary w-4"
                  : index < currentStep
                  ? "bg-primary/50"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            onClick={handlePrevious}
            disabled={isFirst}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            {currentStep + 1} of {tourSteps.length}
          </span>
          <Button onClick={handleNext}>
            {isLast ? "Get Started" : "Next"}
            {!isLast && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </Card>
    </>
  );
}
