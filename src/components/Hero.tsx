import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, TrendingUp, Check, AlertCircle, Clipboard, Sparkles } from "lucide-react";
import heroImage from "@/assets/hero-property.jpg";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const EXAMPLE_URLS = [
  "https://www.zoopla.co.uk/for-sale/details/67891234/",
  "https://www.rightmove.co.uk/properties/123456789",
];

const Hero = () => {
  const [rawInput, setRawInput] = useState("");
  const [debouncedInput, setDebouncedInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [validationState, setValidationState] = useState<{
    isValid: boolean;
    site?: "zoopla" | "rightmove";
    message?: string;
  }>({ isValid: false });
  const navigate = useNavigate();
  const { toast } = useToast();

  // Debounce input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInput(rawInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [rawInput]);

  // Validate URL
  useEffect(() => {
    if (!debouncedInput.trim()) {
      setValidationState({ isValid: false });
      return;
    }

    try {
      const url = new URL(debouncedInput);
      if (!["http:", "https:"].includes(url.protocol)) {
        setValidationState({ isValid: false, message: "URL must use http or https" });
        return;
      }

      const hostname = url.hostname.toLowerCase();
      if (hostname.includes("zoopla.co.uk")) {
        setValidationState({ isValid: true, site: "zoopla", message: "Looks like Zoopla ✓" });
      } else if (hostname.includes("rightmove.co.uk")) {
        setValidationState({ isValid: true, site: "rightmove", message: "Looks like Rightmove ✓" });
      } else {
        setValidationState({ isValid: false, message: "Please paste a Zoopla or Rightmove URL" });
      }
    } catch {
      setValidationState({ isValid: false, message: "Invalid URL format" });
    }
  }, [debouncedInput]);

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRawInput(text);
      toast({ title: "Pasted from clipboard" });
    } catch {
      toast({ 
        title: "Clipboard access denied", 
        description: "Please paste manually or check browser permissions",
        variant: "destructive" 
      });
    }
  };

  const handleUseExample = () => {
    const randomExample = EXAMPLE_URLS[Math.floor(Math.random() * EXAMPLE_URLS.length)];
    setRawInput(randomExample);
    toast({ title: "Example URL loaded" });
  };

  const handleAnalyze = async () => {
    if (!validationState.isValid || isAnalyzing) return;

    setIsAnalyzing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Sign in required",
          description: "Please sign in to analyze properties",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke("ingest-property-url", {
        body: { url: debouncedInput },
      });

      if (error) throw error;

      if (!data.ok) {
        throw new Error(data.details?.message || data.error || "Ingestion failed");
      }
      
      toast({
        title: "Analysis started",
        description: `Processing ${data.items?.length || 0} properties from ${data.site}`,
      });

      // Navigate to sync progress or deals page
      if (data.runId) {
        navigate(`/sync-progress?${data.site}=${data.runId}`);
      } else {
        navigate("/deals");
      }
    } catch (err: any) {
      console.error("Analysis error:", err);
      toast({
        title: "Analysis failed",
        description: err.message || "Failed to analyze property",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

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

          {/* URL Input Section */}
          <div className="space-y-4 mb-8 animate-fade-in-up [animation-delay:150ms]">
            <div className="relative">
              <Input
                type="url"
                placeholder="Paste a Zoopla or Rightmove property URL..."
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                disabled={isAnalyzing}
                className="h-14 pr-32 text-lg bg-background/95 backdrop-blur-sm border-2 focus-visible:ring-2 focus-visible:ring-primary"
              />
              <div className="absolute right-2 top-2 flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handlePasteFromClipboard}
                  disabled={isAnalyzing}
                  title="Paste from clipboard"
                >
                  <Clipboard className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleUseExample}
                  disabled={isAnalyzing}
                  title="Use example URL"
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Validation Message */}
            {debouncedInput && validationState.message && (
              <div className={`flex items-center gap-2 text-sm ${validationState.isValid ? "text-green-600" : "text-amber-600"}`}>
                {validationState.isValid ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span>{validationState.message}</span>
              </div>
            )}

            {/* Analyze Button */}
            <Button
              size="lg"
              onClick={handleAnalyze}
              disabled={!validationState.isValid || isAnalyzing}
              className="w-full sm:w-auto text-lg gap-2 bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-all shadow-lg hover:shadow-glow group disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>Analyzing...</>
              ) : (
                <>
                  Analyze Property
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up [animation-delay:200ms]">
            <Link to="/dashboard">
              <Button 
                size="lg" 
                variant="outline"
                className="text-lg border-2 hover:bg-accent/50 backdrop-blur-sm"
              >
                Dashboard
                <ArrowRight className="h-5 w-5" />
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
