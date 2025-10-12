import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare, Trophy } from "lucide-react";

const Community = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Community</h1>
          <p className="text-muted-foreground mt-1">
            Connect with fellow property investors
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Join the YieldPilot Community
            </CardTitle>
            <CardDescription>
              Connect with investors, share insights, and grow together
            </CardDescription>
          </CardHeader>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Our community features are launching soon. Be the first to know!
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mt-8">
              <div className="p-4 bg-muted rounded-lg">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1">Discussion Forum</h3>
                <p className="text-sm text-muted-foreground">
                  Share insights and ask questions
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1">Team Collaboration</h3>
                <p className="text-sm text-muted-foreground">
                  Share deals with your team
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <Trophy className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1">Leaderboard</h3>
                <p className="text-sm text-muted-foreground">
                  Top contributors and investors
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Community;
