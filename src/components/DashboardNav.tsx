import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  TrendingUp, 
  Building2, 
  Bell,
  Briefcase,
  Search,
  BarChart3,
  Trophy,
  Users,
  DollarSign,
  Key,
  BookOpen,
  Activity,
  Brain,
  Settings,
  Plug,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";

export function DashboardNav() {
  const location = useLocation();

  const mainNav = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/deals", label: "Deals", icon: Building2 },
    { path: "/watchlist", label: "Watchlist", icon: Star },
    { path: "/portfolio", label: "Portfolio", icon: Briefcase },
    { path: "/insights", label: "Insights", icon: TrendingUp },
    { path: "/alerts", label: "Alerts", icon: Bell },
    { path: "/saved-searches", label: "Searches", icon: Search },
    { path: "/ai-assistant", label: "AI Assistant", icon: Brain },
  ];

  const communityNav = [
    { path: "/network", label: "Network", icon: Users },
    { path: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { path: "/benchmarks", label: "Benchmarks", icon: BarChart3 },
  ];

  const adminNav = [
    { path: "/integrations", label: "Integrations", icon: Plug },
    { path: "/forecast-usage", label: "AI Usage", icon: Activity },
    { path: "/ai-telemetry", label: "AI Telemetry", icon: Brain },
    { path: "/billing", label: "Billing", icon: DollarSign },
    { path: "/api-keys", label: "API Keys", icon: Key },
    { path: "/api-docs", label: "API Docs", icon: BookOpen },
    { path: "/organizations", label: "Teams", icon: Settings },
  ];

  return (
    <nav className="space-y-6 py-4">
      <div>
        <h3 className="mb-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Main
        </h3>
        <div className="space-y-1">
          {mainNav.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  isActive && "bg-accent text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Community
        </h3>
        <div className="space-y-1">
          {communityNav.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  isActive && "bg-accent text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Settings & AI
        </h3>
        <div className="space-y-1">
          {adminNav.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  isActive && "bg-accent text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
