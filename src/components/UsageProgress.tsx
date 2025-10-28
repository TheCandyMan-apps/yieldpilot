import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, FileDown } from "lucide-react";
import { formatUsagePercentage } from "@/lib/subscriptionHelpers";
import { cn } from "@/lib/utils";

interface UsageProgressProps {
  ingestsUsed: number;
  ingestsLimit: number;
  exportsUsed: number;
  exportsLimit: number;
}

export function UsageProgress({
  ingestsUsed,
  ingestsLimit,
  exportsUsed,
  exportsLimit,
}: UsageProgressProps) {
  const ingestsData = formatUsagePercentage(ingestsUsed, ingestsLimit);
  const exportsData = formatUsagePercentage(exportsUsed, exportsLimit);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Usage</CardTitle>
        <CardDescription>Track your subscription usage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span>Property Imports</span>
            </div>
            <span className="font-medium">{ingestsData.text}</span>
          </div>
          <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-300",
                ingestsData.color === "danger" && "bg-destructive",
                ingestsData.color === "warning" && "bg-yellow-500",
                ingestsData.color === "success" && "bg-primary"
              )}
              style={{ width: `${ingestsData.percentage}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <FileDown className="h-4 w-4 text-muted-foreground" />
              <span>Exports</span>
            </div>
            <span className="font-medium">{exportsData.text}</span>
          </div>
          <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-300",
                exportsData.color === "danger" && "bg-destructive",
                exportsData.color === "warning" && "bg-yellow-500",
                exportsData.color === "success" && "bg-primary"
              )}
              style={{ width: `${exportsData.percentage}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
