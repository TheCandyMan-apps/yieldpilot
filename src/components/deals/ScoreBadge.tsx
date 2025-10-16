import { cn } from "@/lib/utils";
import { Brain } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ScoreBadgeProps {
  score: number;
  drivers?: string[];
  risks?: string[];
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
}

export const ScoreBadge = ({ 
  score, 
  drivers = [], 
  risks = [],
  size = "md",
  showTooltip = true 
}: ScoreBadgeProps) => {
  const getScoreColor = (s: number) => {
    if (s >= 80) return "bg-green-500 text-white";
    if (s >= 60) return "bg-yellow-500 text-white";
    if (s >= 40) return "bg-orange-500 text-white";
    return "bg-red-500 text-white";
  };

  const getScoreLabel = (s: number) => {
    if (s >= 80) return "Excellent BTL";
    if (s >= 60) return "Good BTL";
    if (s >= 40) return "Fair Deal";
    return "Weak Deal";
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2",
  };

  const badge = (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-bold",
        getScoreColor(score),
        sizeClasses[size]
      )}
    >
      <Brain className="h-3 w-3" />
      <span>{score}/100</span>
    </div>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold">{score}/100: {getScoreLabel(score)}</p>
            
            {drivers.length > 0 && (
              <div>
                <p className="text-xs font-medium text-green-400">Drivers:</p>
                <ul className="text-xs space-y-0.5">
                  {drivers.map((d, i) => (
                    <li key={i}>• {d}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {risks.length > 0 && (
              <div>
                <p className="text-xs font-medium text-orange-400">Risks:</p>
                <ul className="text-xs space-y-0.5">
                  {risks.map((r, i) => (
                    <li key={i}>• {r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
