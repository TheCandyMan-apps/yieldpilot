import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatHistory } from "@/components/ai/ChatHistory";
import { SmartRecommendations } from "@/components/ai/SmartRecommendations";
import { MarketIntelligence } from "@/components/ai/MarketIntelligence";
import { MessageSquare, Sparkles, Globe } from "lucide-react";
import { EntitlementGuard } from "@/components/EntitlementGuard";
import { PREMIUM_FEATURES } from "@/lib/entitlements";

export default function AIAssistant() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">AI Assistant</h1>
          <p className="text-muted-foreground">
            Your intelligent property investment companion
          </p>
        </div>

        <EntitlementGuard feature={PREMIUM_FEATURES.AI_ASSISTANT}>
          <Tabs defaultValue="market-intelligence" className="space-y-6">
            <TabsList>
              <TabsTrigger value="market-intelligence">
                <Globe className="h-4 w-4 mr-2" />
                Market Intelligence
              </TabsTrigger>
              <TabsTrigger value="recommendations">
                <Sparkles className="h-4 w-4 mr-2" />
                Recommendations
              </TabsTrigger>
              <TabsTrigger value="history">
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="market-intelligence" className="space-y-4">
              <MarketIntelligence />
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-4">
              <SmartRecommendations />
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Previous Conversations</h3>
                <ChatHistory />
              </Card>
            </TabsContent>
          </Tabs>
        </EntitlementGuard>
      </div>
    </DashboardLayout>
  );
}
