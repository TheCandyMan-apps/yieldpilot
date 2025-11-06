import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Target } from "lucide-react";
import { Tutorial, markTutorialComplete } from "@/lib/tutorials";
import { toast } from "sonner";

interface FeatureTutorialProps {
  tutorial: Tutorial;
  onComplete: () => void;
  onSkip: () => void;
}

export function FeatureTutorial({ tutorial, onComplete, onSkip }: FeatureTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);

  const step = tutorial.steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === tutorial.steps.length - 1;

  useEffect(() => {
    // Find and highlight the target element
    const element = document.querySelector(step.target) as HTMLElement;
    setHighlightedElement(element);

    if (element) {
      // Scroll element into view
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      
      // Add highlight class
      element.classList.add("tutorial-highlight");
    }

    return () => {
      // Remove highlight when moving to next step
      if (element) {
        element.classList.remove("tutorial-highlight");
      }
    };
  }, [currentStep, step.target]);

  const handleNext = () => {
    if (isLast) {
      handleComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    markTutorialComplete(tutorial.id);
    toast.success(`Tutorial "${tutorial.title}" completed! 🎉`);
    onComplete();
  };

  const handleSkip = () => {
    onSkip();
  };

  // Calculate position for the tutorial card relative to highlighted element
  const getCardPosition = () => {
    if (!highlightedElement) return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

    const rect = highlightedElement.getBoundingClientRect();
    const cardWidth = 400;
    const cardHeight = 300;
    const padding = 20;

    let top = "50%";
    let left = "50%";
    let transform = "translate(-50%, -50%)";

    switch (step.position) {
      case "top":
        top = `${Math.max(rect.top - cardHeight - padding, padding)}px`;
        left = `${rect.left + rect.width / 2}px`;
        transform = "translateX(-50%)";
        break;
      case "bottom":
        top = `${rect.bottom + padding}px`;
        left = `${rect.left + rect.width / 2}px`;
        transform = "translateX(-50%)";
        break;
      case "left":
        top = `${rect.top + rect.height / 2}px`;
        left = `${Math.max(rect.left - cardWidth - padding, padding)}px`;
        transform = "translateY(-50%)";
        break;
      case "right":
        top = `${rect.top + rect.height / 2}px`;
        left = `${rect.right + padding}px`;
        transform = "translateY(-50%)";
        break;
      default:
        // center
        break;
    }

    return { top, left, transform };
  };

  const cardPosition = getCardPosition();

  return (
    <>
      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 animate-fade-in" />

      {/* Spotlight effect on target element */}
      {highlightedElement && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            top: highlightedElement.getBoundingClientRect().top - 8,
            left: highlightedElement.getBoundingClientRect().left - 8,
            width: highlightedElement.getBoundingClientRect().width + 16,
            height: highlightedElement.getBoundingClientRect().height + 16,
            boxShadow: "0 0 0 4px hsl(var(--primary)), 0 0 0 9999px rgba(0, 0, 0, 0.75)",
            borderRadius: "8px",
            transition: "all 0.3s ease-out",
          }}
        />
      )}

      {/* Tutorial Card */}
      <Card
        className="fixed z-50 w-full max-w-md p-6 space-y-4 animate-scale-in shadow-glow"
        style={cardPosition}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <Button variant="ghost" size="icon" onClick={handleSkip} className="flex-shrink-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">{step.description}</p>
              {step.actionText && (
                <div className="flex items-center gap-2 mt-2 text-xs text-primary">
                  <span className="font-medium">→ {step.actionText}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tutorial progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{tutorial.title}</span>
            <span>
              Step {currentStep + 1} of {tutorial.steps.length}
            </span>
          </div>
          <div className="flex gap-1">
            {tutorial.steps.map((_, index) => (
              <div
                key={index}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  index === currentStep
                    ? "bg-primary"
                    : index < currentStep
                    ? "bg-primary/50"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" onClick={handlePrevious} disabled={isFirst}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button onClick={handleNext} className="gap-2">
            {isLast ? (
              <>
                Complete
                <Target className="h-4 w-4" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        <div className="pt-2 border-t">
          <Button variant="ghost" size="sm" onClick={handleSkip} className="w-full text-xs">
            Skip tutorial
          </Button>
        </div>
      </Card>
    </>
  );
}
