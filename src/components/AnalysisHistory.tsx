import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, MapPin } from "lucide-react";
import { toast } from "sonner";

interface AnalysisHistoryProps {
  onSelectAnalysis: (analysis: any) => void;
}

const AnalysisHistory = ({ onSelectAnalysis }: AnalysisHistoryProps) => {
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const fetchAnalyses = async () => {
    try {
      const { data, error } = await supabase
        .from("property_analyses")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setAnalyses(data || []);
    } catch (error: any) {
      console.error("Error fetching analyses:", error);
      toast.error("Failed to load analysis history");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No previous analyses yet. Start your first analysis above!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {analyses.map((analysis) => (
        <Card
          key={analysis.id}
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => onSelectAnalysis(analysis)}
        >
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <p className="font-semibold text-sm line-clamp-2">
                  {analysis.property_address}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price:</span>
                <span className="font-medium">
                  £{analysis.property_price?.toLocaleString()}
                </span>
              </div>

              {analysis.analysis_status === "completed" && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">ROI:</span>
                    <span className="font-medium text-primary">
                      {analysis.roi_percentage?.toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Yield:</span>
                    <span className="font-medium text-secondary">
                      {analysis.net_yield_percentage?.toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Badge
                      variant={
                        analysis.deal_quality_score >= 80
                          ? "default"
                          : analysis.deal_quality_score >= 60
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      Score: {analysis.deal_quality_score}/100
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(analysis.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </>
              )}

              {analysis.analysis_status === "pending" && (
                <Badge variant="outline">Processing...</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AnalysisHistory;