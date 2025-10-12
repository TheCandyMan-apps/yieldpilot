import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, AlertCircle, Lightbulb } from "lucide-react";

const insights = [
  {
    category: "Market Trend",
    icon: TrendingUp,
    title: "UK Property Market Shows 3.2% Growth in Q1 2025",
    excerpt: "Analysis shows continued growth in regional markets, with Manchester and Birmingham leading the charge. First-time buyer activity up 15%.",
    date: "2 days ago",
    readTime: "4 min read"
  },
  {
    category: "Investment Tip",
    icon: Lightbulb,
    title: "5 Key Indicators of a High-Yield Property",
    excerpt: "Learn to identify properties with strong rental yields. Focus on transport links, local amenities, employment rates, and regeneration projects.",
    date: "5 days ago",
    readTime: "6 min read"
  },
  {
    category: "Alert",
    icon: AlertCircle,
    title: "New Stamp Duty Changes: What Investors Need to Know",
    excerpt: "Recent policy updates affect buy-to-let investors. Understand the implications for your portfolio and strategies to minimize tax liability.",
    date: "1 week ago",
    readTime: "5 min read"
  }
];

const MarketInsights = () => {
  return (
    <section className="py-20 bg-accent/30" id="insights">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            Latest Market <span className="text-primary">Insights</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Stay informed with expert analysis and property market intelligence
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto mb-8">
          {insights.map((insight, index) => {
            const Icon = insight.icon;
            return (
              <Card key={index} className="border-2 hover-scale">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-primary">{insight.category}</span>
                  </div>
                  <CardTitle className="text-xl hover:text-primary transition-colors cursor-pointer">
                    {insight.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">{insight.excerpt}</p>
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{insight.date}</span>
                    <span>{insight.readTime}</span>
                  </div>

                  <Button variant="ghost" className="w-full group">
                    Read More
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center">
          <Button size="lg" variant="outline">
            View All Insights
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default MarketInsights;
