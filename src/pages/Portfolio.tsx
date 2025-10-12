import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, TrendingUp, DollarSign, Home } from "lucide-react";

const Portfolio = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Portfolio</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage your property investments
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Briefcase className="h-5 w-5 mr-2" />
              Coming Soon
            </CardTitle>
            <CardDescription>
              This feature is under development
            </CardDescription>
          </CardHeader>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Portfolio analytics and tracking will be available in Phase C
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mt-8">
              <div className="p-4 bg-muted rounded-lg">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1">Performance Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Monitor property value and rent trends
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <DollarSign className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1">Cash Flow Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Track income vs expenses over time
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <Home className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1">Portfolio Health</h3>
                <p className="text-sm text-muted-foreground">
                  Overall portfolio scoring and insights
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Portfolio;
