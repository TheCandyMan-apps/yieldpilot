import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MarketBadgeProps {
  region: string;
  source?: string;
  className?: string;
}

const MARKET_CONFIG: Record<string, { flag: string; name: string; currency: string }> = {
  UK: { flag: "🇬🇧", name: "United Kingdom", currency: "GBP" },
  US: { flag: "🇺🇸", name: "United States", currency: "USD" },
  DE: { flag: "🇩🇪", name: "Germany", currency: "EUR" },
  ES: { flag: "🇪🇸", name: "Spain", currency: "EUR" },
  FR: { flag: "🇫🇷", name: "France", currency: "EUR" },
  GB: { flag: "🇬🇧", name: "United Kingdom", currency: "GBP" },
};

const SOURCE_DISPLAY: Record<string, string> = {
  zoopla: "Zoopla",
  rightmove: "Rightmove",
  zillow: "Zillow",
  realtor: "Realtor.com",
  redfin: "Redfin",
  idealista: "Idealista",
  immobilienscout: "ImmobilienScout24",
  seloger: "SeLoger",
};

export function MarketBadge({ region, source, className = "" }: MarketBadgeProps) {
  const market = MARKET_CONFIG[region] || MARKET_CONFIG.UK;
  const sourceName = source ? SOURCE_DISPLAY[source] || source : null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className={`font-medium ${className}`}>
            <span className="mr-1">{market.flag}</span>
            {market.currency}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">{market.name}</p>
          {sourceName && <p className="text-xs text-muted-foreground">Source: {sourceName}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
