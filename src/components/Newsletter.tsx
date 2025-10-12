import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, TrendingUp } from "lucide-react";
import { toast } from "sonner";

const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      toast.success("Thanks for subscribing! Check your inbox for confirmation.");
      setEmail("");
      setIsLoading(false);
    }, 1000);
  };

  return (
    <section className="py-20 bg-primary text-primary-foreground" id="newsletter">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 rounded-full bg-primary-foreground/10 flex items-center justify-center">
              <Mail className="h-8 w-8" />
            </div>
          </div>
          
          <h2 className="text-4xl font-bold mb-4">
            Stay Ahead of the Market
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-8">
            Get weekly property investment insights, market trends, and exclusive tips delivered to your inbox
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50"
            />
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
            >
              {isLoading ? "Subscribing..." : "Subscribe"}
            </Button>
          </form>

          <div className="mt-8 flex flex-wrap justify-center gap-8 text-sm text-primary-foreground/70">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span>Weekly Market Updates</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>Investment Tips</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span>Exclusive Deals</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
