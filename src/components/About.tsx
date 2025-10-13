import { Card, CardContent } from "@/components/ui/card";
import { Target, Users, TrendingUp, Shield } from "lucide-react";

const values = [
  {
    icon: Target,
    title: "Built for Real Investors",
    description: "Created by property investors who got tired of spending hours on Excel spreadsheets, making calculation errors, and missing opportunities because analysis took too long. We've analyzed thousands of deals ourselves—we know what matters.",
  },
  {
    icon: Users,
    title: "Democratizing Investment Intelligence",
    description: "Professional-grade property analysis used to require expensive consultants or years of experience. YieldPilot brings institutional-level insights to individual investors at a fraction of the cost, leveling the playing field for everyone.",
  },
  {
    icon: TrendingUp,
    title: "Speed Equals Opportunity",
    description: "In competitive markets, deals disappear in hours. The faster you can evaluate a property, the more deals you can review, and the higher your chances of securing profitable investments before others even finish their calculations.",
  },
  {
    icon: Shield,
    title: "Protecting Your Capital",
    description: "One bad investment can wipe out years of gains. Our AI-powered analysis helps you spot red flags, hidden costs, and overpriced properties before you commit. Think of it as having a seasoned mentor reviewing every deal with you.",
  },
];

const stats = [
  { number: "10,000+", label: "Properties Analyzed", sublabel: "Across UK, EU & US markets" },
  { number: "£500M+", label: "Investment Value Assessed", sublabel: "In total transaction volume" },
  { number: "2,500+", label: "Active Investors", sublabel: "Making smarter decisions daily" },
  { number: "92%", label: "Time Saved", sublabel: "vs. manual spreadsheet analysis" },
];

const About = () => {
  return (
    <section id="about" className="py-24 bg-gradient-to-b from-background via-muted/20 to-background">
      <div className="container mx-auto px-4">
        {/* Main About Content */}
        <div className="max-w-4xl mx-auto text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            About
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"> YieldPilot</span>
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed mb-6">
            Every year, billions in capital is lost to poor property investments—deals that looked good on paper but failed due to 
            incomplete analysis, overlooked costs, or emotional decision-making. We built YieldPilot to solve this problem.
          </p>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Our mission is simple: <span className="text-foreground font-semibold">help you make faster, smarter, and more profitable property 
            investment decisions</span>. By combining AI technology with battle-tested investment frameworks, we turn weeks of research 
            into seconds of clarity. Whether you're analyzing your first rental property or managing a multi-million pound portfolio, 
            YieldPilot gives you the confidence to act decisively.
          </p>
        </div>

        {/* Values Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-20 max-w-6xl mx-auto">
          {values.map((value, index) => {
            const Icon = value.icon;
            return (
              <Card 
                key={index}
                className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg bg-card/80 backdrop-blur-sm group"
              >
                <CardContent className="p-8">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">{value.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{value.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Stats Section */}
        <div className="bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 rounded-2xl border-2 border-border/50 p-12">
          <h3 className="text-3xl font-bold text-center mb-12">
            Trusted by Investors Worldwide
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                  {stat.number}
                </div>
                <div className="text-lg font-semibold text-foreground mb-1">{stat.label}</div>
                <div className="text-sm text-muted-foreground">{stat.sublabel}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Problem/Solution Statement */}
        <div className="mt-20 max-w-4xl mx-auto">
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
            <CardContent className="p-10">
              <h3 className="text-2xl md:text-3xl font-bold mb-6 text-center">
                The Cost of Slow Decision-Making
              </h3>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-semibold text-lg mb-3 text-destructive">❌ The Old Way</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• 5-10 hours building Excel models per property</li>
                    <li>• Manual research across multiple websites</li>
                    <li>• Calculation errors costing thousands</li>
                    <li>• Missing deals while competitors move faster</li>
                    <li>• Analysis paralysis from information overload</li>
                    <li>• Paying £1,000+ for professional valuations</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-3 text-success">✓ The YieldPilot Way</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• 30-second comprehensive analysis</li>
                    <li>• Automated data aggregation from trusted sources</li>
                    <li>• AI-verified calculations every time</li>
                    <li>• Evaluate 20+ deals per hour</li>
                    <li>• Clear, actionable recommendations</li>
                    <li>• From £19/month unlimited access</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default About;
