import { Calculator, TrendingUp, FileText, DollarSign, MapPin, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Calculator,
    title: "ROI Calculator",
    description: "Get precise return on investment calculations instantly. No more manual spreadsheets—automatically factor in purchase costs, renovation expenses, and ongoing fees. Save 3+ hours per property and avoid calculation errors that could cost thousands.",
  },
  {
    icon: TrendingUp,
    title: "Yield Analysis",
    description: "Project your annual rental yields and long-term cash flow with accuracy. Understand your monthly income potential, vacancy risks, and break-even timelines. Make confident decisions knowing exactly when your investment will start generating profit.",
  },
  {
    icon: FileText,
    title: "Deal Reports",
    description: "Generate professional, investor-ready PDF reports in seconds. Impress partners, lenders, and stakeholders with comprehensive analysis documents. Save hours of formatting and present like a seasoned pro—no design skills required.",
  },
  {
    icon: DollarSign,
    title: "Mortgage Options",
    description: "Compare financing scenarios side-by-side to maximize your leverage. See how different mortgage rates, deposit amounts, and loan terms impact your returns. Find the optimal financing structure that could boost your ROI by 15-30%.",
  },
  {
    icon: MapPin,
    title: "Location Intel",
    description: "Access hyperlocal market data including rental demand, average yields, and area growth trends. Identify up-and-coming neighborhoods before they peak. Avoid saturated markets and discover hidden gem locations with strong rental fundamentals.",
  },
  {
    icon: Zap,
    title: "AI Insights",
    description: "Get intelligent deal quality scoring and risk assessment powered by AI. Instantly flag red flags like overpricing, poor rental potential, or hidden costs. Let AI learn from thousands of deals to give you the same insights as veteran investors.",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Everything You Need to
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"> Analyze Deals</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Professional-grade tools that help you analyze faster, decide smarter, and invest with confidence. Every feature designed to save you time and protect your capital.
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
