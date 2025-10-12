import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp } from "lucide-react";
import heroImage from "@/assets/hero-property.jpg";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroImage} 
          alt="Luxury property investment showing modern real estate development with high ROI potential"
          className="w-full h-full object-cover"
          loading="eager"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/85 to-background/60" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/50 backdrop-blur-sm border border-border mb-6 animate-fade-in">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-accent-foreground">AI-Powered Property Analysis</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight animate-fade-in-up">
            YieldPilot — Find • Analyze • Profit
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed animate-fade-in-up [animation-delay:100ms]">
            AI-driven insights for smarter property investing. Stop wasting hours on spreadsheets and guesswork. Get instant ROI analysis, accurate yield projections, and cash flow forecasts in under 30 seconds.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up [animation-delay:200ms]">
            <Link to="/dashboard">
              <Button 
                size="lg" 
                className="text-lg gap-2 bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-all shadow-lg hover:shadow-glow group"
              >
                Start Analysis
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/deals">
              <Button 
                size="lg" 
                variant="outline"
                className="text-lg border-2 hover:bg-accent/50 backdrop-blur-sm"
              >
                Browse Deals
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-12 pt-12 border-t border-border/50 animate-fade-in-up [animation-delay:300ms]">
            <div>
              <div className="text-3xl font-bold text-foreground mb-1">10k+</div>
              <div className="text-sm text-muted-foreground">Properties Analyzed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-foreground mb-1">98%</div>
              <div className="text-sm text-muted-foreground">Accuracy Rate</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-foreground mb-1">&lt;30s</div>
              <div className="text-sm text-muted-foreground">Analysis Time</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
