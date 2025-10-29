import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertCircle, CheckCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface HealthStatus {
  status: "healthy" | "degraded" | "error";
  ai?: {
    status: string;
    latency_ms?: number;
  };
  system?: {
    uptime_pct?: number;
  };
}

export function HealthStatus() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('health-ai');
        if (error) throw error;
        setHealth(data as HealthStatus);
      } catch (error) {
        console.error('Health check failed:', error);
        setHealth({ status: 'error' });
      } finally {
        setLoading(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Badge variant="outline" className="gap-1">
        <Activity className="h-3 w-3 animate-pulse" />
        <span className="text-xs">Checking...</span>
      </Badge>
    );
  }

  if (!health) return null;

  const statusConfig = {
    healthy: {
      icon: CheckCircle,
      label: "Healthy",
      variant: "default" as const,
      color: "text-green-500"
    },
    degraded: {
      icon: AlertCircle,
      label: "Degraded",
      variant: "secondary" as const,
      color: "text-yellow-500"
    },
    error: {
      icon: AlertCircle,
      label: "Error",
      variant: "destructive" as const,
      color: "text-red-500"
    }
  };

  const config = statusConfig[health.status];
  const Icon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger>
        <Badge variant={config.variant} className="gap-1">
          <Icon className={`h-3 w-3 ${config.color}`} />
          <span className="text-xs">{config.label}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs space-y-1">
          <div>AI Status: {health.ai?.status || 'Unknown'}</div>
          {health.ai?.latency_ms && (
            <div>Latency: {health.ai.latency_ms}ms</div>
          )}
          {health.system?.uptime_pct && (
            <div>Uptime: {health.system.uptime_pct.toFixed(2)}%</div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
