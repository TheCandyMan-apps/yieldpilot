import { TrendingUp, Users, Building2, Award } from "lucide-react";

const stats = [
  {
    icon: Users,
    value: "12,500+",
    label: "Active Investors",
    description: "Trust YieldPilot"
  },
  {
    icon: Building2,
    value: "45,000+",
    label: "Properties Analyzed",
    description: "In the last year"
  },
  {
    icon: TrendingUp,
    value: "£2.3B+",
    label: "Investment Value",
    description: "Analyzed to date"
  },
  {
    icon: Award,
    value: "4.9/5",
    label: "Average Rating",
    description: "From 3,200+ reviews"
  }
];

const TrustStats = () => {
  return (
    <section className="py-20 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            Trusted by Thousands of Investors
          </h2>
          <p className="text-xl text-primary-foreground/80 max-w-2xl mx-auto">
            Join a growing community making smarter property investment decisions
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 rounded-full bg-primary-foreground/10 flex items-center justify-center">
                    <Icon className="h-8 w-8" />
                  </div>
                </div>
                <div className="text-4xl font-bold mb-2">{stat.value}</div>
                <div className="text-xl font-semibold mb-1">{stat.label}</div>
                <div className="text-primary-foreground/70">{stat.description}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TrustStats;
