import { Calculator, TrendingUp, FileText, DollarSign, MapPin, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Calculator,
    title: "ROI Calculator",
    description: "Instant return on investment calculations with real-time market data",
  },
  {
    icon: TrendingUp,
    title: "Yield Analysis",
    description: "Comprehensive yield forecasts and cash flow projections",
  },
  {
    icon: FileText,
    title: "Deal Reports",
    description: "Professional PDF reports ready to share with investors",
  },
  {
    icon: DollarSign,
    title: "Mortgage Options",
    description: "Compare mortgage rates and financing scenarios",
  },
  {
    icon: MapPin,
    title: "Location Intel",
    description: "Local market insights and rental demand analysis",
  },
  {
    icon: Zap,
    title: "AI Insights",
    description: "Smart recommendations and deal quality scoring",
  },
];

const Features = () => {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Everything You Need to
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"> Analyze Deals</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed for serious property investors
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index}
                className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-card/80 backdrop-blur-sm group"
              >
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
