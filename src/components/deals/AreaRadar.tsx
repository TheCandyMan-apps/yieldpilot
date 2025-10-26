import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Shield, Droplet, Zap, HelpCircle } from "lucide-react";

interface AreaRadarProps {
  enrichment?: {
    epc?: { rating?: string; provenance?: string };
    crime?: { level?: string; provenance?: string };
    flood?: { risk?: string; provenance?: string };
  };
}

export const AreaRadar = ({ enrichment }: AreaRadarProps) => {
  const getEPCColor = (rating?: string) => {
    if (!rating) return "bg-muted text-muted-foreground border-muted";
    const r = rating.toUpperCase();
    if (r === "A" || r === "B") return "bg-green-100 text-green-700 border-green-300";
    if (r === "C" || r === "D") return "bg-yellow-100 text-yellow-700 border-yellow-300";
    return "bg-orange-100 text-orange-700 border-orange-300";
  };

  const getCrimeColor = (level?: string) => {
    if (!level) return "bg-muted text-muted-foreground border-muted";
    const l = level.toLowerCase();
    if (l === "low") return "bg-green-100 text-green-700 border-green-300";
    if (l === "medium") return "bg-yellow-100 text-yellow-700 border-yellow-300";
    return "bg-red-100 text-red-700 border-red-300";
  };

  const getFloodColor = (risk?: string) => {
    if (!risk) return "bg-muted text-muted-foreground border-muted";
    const r = risk.toLowerCase();
    if (r === "low" || r === "very low") return "bg-green-100 text-green-700 border-green-300";
    if (r === "medium") return "bg-yellow-100 text-yellow-700 border-yellow-300";
    return "bg-red-100 text-red-700 border-red-300";
  };

  const epcRating = enrichment?.epc?.rating || null;
  const epcProvenance = enrichment?.epc?.provenance || "mock";
  const crimeLevel = enrichment?.crime?.level || null;
  const crimeProvenance = enrichment?.crime?.provenance || "mock";
  const floodRisk = enrichment?.flood?.risk || null;
  const floodProvenance = enrichment?.flood?.provenance || "mock";

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-2">
        {/* EPC */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={`gap-1 ${getEPCColor(epcRating)}`}
            >
              <Zap className="h-3 w-3" />
              {epcRating ? `EPC: ${epcRating}` : "EPC: Unknown"}
              {epcProvenance === "mock" && <HelpCircle className="h-3 w-3 opacity-50" />}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-xs">
              {epcRating
                ? `Energy Performance Certificate rating: ${epcRating}. ${
                    epcProvenance === "mock"
                      ? "Estimated - verify with EPC register."
                      : "Verified data."
                  }`
                : "EPC data unavailable. Treat as potential upgrade risk."}
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Crime */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={`gap-1 ${getCrimeColor(crimeLevel)}`}
            >
              <Shield className="h-3 w-3" />
              {crimeLevel ? `Crime: ${crimeLevel}` : "Crime: Unknown"}
              {crimeProvenance === "mock" && <HelpCircle className="h-3 w-3 opacity-50" />}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-xs">
              {crimeLevel
                ? `Area crime level: ${crimeLevel}. ${
                    crimeProvenance === "mock"
                      ? "Estimated - check police.uk for details."
                      : "Verified data."
                  }`
                : "Crime data unavailable. Research area safety independently."}
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Flood */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={`gap-1 ${getFloodColor(floodRisk)}`}
            >
              <Droplet className="h-3 w-3" />
              {floodRisk ? `Flood: ${floodRisk}` : "Flood: Unknown"}
              {floodProvenance === "mock" && <HelpCircle className="h-3 w-3 opacity-50" />}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-xs">
              {floodRisk
                ? `Flood risk: ${floodRisk}. ${
                    floodProvenance === "mock"
                      ? "Estimated - verify with Environment Agency."
                      : "Verified data."
                  }`
                : "Flood risk unknown. Check flood maps before proceeding."}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
