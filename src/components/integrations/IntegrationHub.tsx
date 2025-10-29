import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, CheckCircle, Settings } from "lucide-react";
import { useState } from "react";

interface Integration {
  id: string;
  name: string;
  description: string;
  logo: string;
  status: "connected" | "available" | "coming_soon";
  category: "property" | "finance" | "analytics" | "workflow";
}

const integrations: Integration[] = [
  {
    id: "rightmove",
    name: "Rightmove",
    description: "Import properties directly from Rightmove listings",
    logo: "🏠",
    status: "connected",
    category: "property",
  },
  {
    id: "zoopla",
    name: "Zoopla",
    description: "Sync properties and get market valuations",
    logo: "🏘️",
    status: "connected",
    category: "property",
  },
  {
    id: "zillow",
    name: "Zillow",
    description: "Import US properties and rental estimates",
    logo: "🇺🇸",
    status: "available",
    category: "property",
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Process payments and subscriptions",
    logo: "💳",
    status: "connected",
    category: "finance",
  },
  {
    id: "resend",
    name: "Resend",
    description: "Email notifications and alerts",
    logo: "📧",
    status: "connected",
    category: "workflow",
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Connect with 5000+ apps and automate workflows",
    logo: "⚡",
    status: "coming_soon",
    category: "workflow",
  },
  {
    id: "excel",
    name: "Excel / Google Sheets",
    description: "Export and import data via spreadsheets",
    logo: "📊",
    status: "available",
    category: "analytics",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Get deal alerts in your Slack workspace",
    logo: "💬",
    status: "coming_soon",
    category: "workflow",
  },
];

export function IntegrationHub() {
  const [filter, setFilter] = useState<string>("all");

  const filteredIntegrations =
    filter === "all"
      ? integrations
      : integrations.filter((i) => i.category === filter);

  const getStatusBadge = (status: Integration["status"]) => {
    switch (status) {
      case "connected":
        return (
          <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        );
      case "available":
        return <Badge variant="secondary">Available</Badge>;
      case "coming_soon":
        return <Badge variant="outline">Coming Soon</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Integration Hub</h2>
        <p className="text-muted-foreground">
          Connect YieldPilot with your favorite tools
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All
        </Button>
        <Button
          variant={filter === "property" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("property")}
        >
          Property Sources
        </Button>
        <Button
          variant={filter === "finance" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("finance")}
        >
          Finance
        </Button>
        <Button
          variant={filter === "analytics" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("analytics")}
        >
          Analytics
        </Button>
        <Button
          variant={filter === "workflow" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("workflow")}
        >
          Workflow
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredIntegrations.map((integration) => (
          <Card key={integration.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="text-4xl">{integration.logo}</div>
              {getStatusBadge(integration.status)}
            </div>
            <h3 className="font-semibold mb-2">{integration.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {integration.description}
            </p>
            <Button
              variant={integration.status === "connected" ? "outline" : "default"}
              size="sm"
              className="w-full"
              disabled={integration.status === "coming_soon"}
            >
              {integration.status === "connected" ? (
                <>
                  <Settings className="h-4 w-4 mr-2" />
                  Manage
                </>
              ) : integration.status === "coming_soon" ? (
                "Coming Soon"
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Connect
                </>
              )}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
