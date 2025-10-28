import { Badge } from "@/components/ui/badge";
import { Crown, Zap, Users, Rocket } from "lucide-react";
import { SubscriptionTier } from "@/lib/subscriptionHelpers";

interface SubscriptionBadgeProps {
  tier: SubscriptionTier;
  variant?: "default" | "outline" | "secondary";
}

const tierConfig = {
  free: {
    label: "Free",
    icon: null,
    className: "bg-muted text-muted-foreground",
  },
  starter: {
    label: "Starter",
    icon: Zap,
    className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  pro: {
    label: "Pro",
    icon: Crown,
    className: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  },
  team: {
    label: "Team",
    icon: Users,
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
};

export function SubscriptionBadge({ tier, variant }: SubscriptionBadgeProps) {
  const config = tierConfig[tier];
  const Icon = config.icon;

  return (
    <Badge variant={variant} className={variant ? "" : config.className}>
      {Icon && <Icon className="h-3 w-3 mr-1" />}
      {config.label}
    </Badge>
  );
}
