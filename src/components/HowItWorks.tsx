import { Card, CardContent } from "@/components/ui/card";
import { Upload, Brain, BarChart3 } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "Input Property Details",
    description: "Simply paste a property listing URL or manually enter the address, price, and basic details. Takes just 30 seconds—no complicated forms or endless data entry. Works with UK, EU, and US markets.",
    number: "01",
  },
  {
    icon: Brain,
    title: "AI Analyzes Everything",
    description: "Our AI instantly crunches the numbers—calculating purchase costs, stamp duty, renovation estimates, rental income potential, void periods, maintenance costs, and mortgage scenarios. What takes hours in Excel happens in under 30 seconds.",
    number: "02",
  },
  {
    icon: BarChart3,
    title: "Get Actionable Insights",
    description: "Review comprehensive ROI metrics, net yield percentages, monthly cash flow projections, and a deal quality score. See exactly how profitable this property will be and whether it's worth pursuing. Export reports to share with partners or save for your records.",
    number: "03",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            How It
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"> Works</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            From property listing to confident investment decision in under 60 seconds. No spreadsheets, no guesswork—just clear, actionable data that helps you move faster than the competition.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="relative">
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-20 left-full w-full h-0.5 bg-gradient-to-r from-primary/30 to-transparent -translate-x-1/2" />
                )}
                
                <Card className="border-2 hover:border-primary/50 transition-all duration-300 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 text-[120px] font-bold text-muted/5 leading-none group-hover:text-primary/5 transition-colors">
                    {step.number}
                  </div>
                  
                  <CardContent className="p-8 relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                      <Icon className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <h3 className="text-2xl font-semibold mb-3">{step.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
