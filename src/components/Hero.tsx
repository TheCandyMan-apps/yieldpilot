import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, TrendingUp, Check, AlertCircle, Clipboard, Info, Copy } from "lucide-react";
import heroImage from "@/assets/hero-property.jpg";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { checkUsageLimit } from "@/lib/planLimits";
import { Badge } from "@/components/ui/badge";

const EXAMPLE_URLS = {
  zoopla: "https://www.zoopla.co.uk/for-sale/details/67891234/",
  rightmove: "https://www.rightmove.co.uk/properties/123456789#/?channel=RES_BUY",
};

const Hero = () => {
  const [rawInput, setRawInput] = useState("");
  const [debouncedInput, setDebouncedInput] = useState("");
  const [normalizedPreview, setNormalizedPreview] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressStep, setProgressStep] = useState("");
  const [diagnostics, setDiagnostics] = useState<{
    requestId?: string;
    runId?: string;
    datasetId?: string;
  }>({});
  const [validationState, setValidationState] = useState<{
    isValid: boolean;
    site?: "zoopla" | "rightmove";
    message?: string;
  }>({ isValid: false });
  const [usageLimit, setUsageLimit] = useState<{ allowed: boolean; used: number; limit: number } | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Debounce input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInput(rawInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [rawInput]);

  // Validate and normalize URL
  useEffect(() => {
    if (!debouncedInput.trim()) {
      setValidationState({ isValid: false });
      setNormalizedPreview("");
      return;
    }

    try {
      let url = debouncedInput.trim();
      // Auto-prefix https:// if starts with www.
      if (url.startsWith("www.")) {
        url = "https://" + url;
      }

      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        setValidationState({ isValid: false, message: "URL must use http or https" });
        setNormalizedPreview("");
        return;
      }

      setNormalizedPreview(parsed.toString());

      const hostname = parsed.hostname.toLowerCase();
      if (hostname.includes("zoopla.co.uk")) {
        setValidationState({ isValid: true, site: "zoopla", message: "✓ Zoopla URL detected" });
      } else if (hostname.includes("rightmove.co.uk")) {
        setValidationState({ isValid: true, site: "rightmove", message: "✓ Rightmove URL detected" });
      } else {
        setValidationState({ isValid: false, message: "Only Zoopla or Rightmove links supported" });
        setNormalizedPreview("");
      }
    } catch {
      setValidationState({ isValid: false, message: "Invalid URL format" });
      setNormalizedPreview("");
    }
  }, [debouncedInput]);

  // Check usage limits on mount
  useEffect(() => {
    checkUsageLimits();
  }, []);

  const checkUsageLimits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const result = await checkUsageLimit(user.id, "ingests");
        setUsageLimit(result);
      }
    } catch (error) {
      console.error("Error checking usage limits:", error);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRawInput(text);
      toast({ title: "📋 Pasted from clipboard" });
    } catch {
      toast({
        title: "Clipboard access denied",
        description: "Please paste manually or check browser permissions",
        variant: "destructive",
      });
    }
  };

  const handleUseExample = (site: "zoopla" | "rightmove") => {
    setRawInput(EXAMPLE_URLS[site]);
    toast({
      title: `${site === "zoopla" ? "Zoopla" : "Rightmove"} example loaded`,
      description: "Try analyzing this sample property",
    });
  };

  const copyDiagnostics = () => {
    const text = JSON.stringify(diagnostics, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "📋 Diagnostics copied to clipboard" });
    });
  };

  const getErrorMessage = (error: any): string => {
    const errorType = error?.error || error?.message || "unknown";

    // Map specific error types to user-friendly messages
    if (errorType === "unsupported_site") {
      return "Only Zoopla or Rightmove links supported. Please check the URL.";
    }
    if (errorType === "apify_start_failed") {
      const status = error?.details?.status;
      if (status === 402) {
        return "Apify quota exceeded. Please check your Apify plan limits.";
      }
      if (status === 429) {
        return "Rate limit exceeded. Please try again in a few moments.";
      }
      return error?.details?.message || "Failed to start property scraper. Try again.";
    }
    if (errorType === "no_items") {
      return "No properties found. The URL may not contain any listings.";
    }
    if (errorType === "polling_timeout") {
      return "Request timed out. The scraper is taking longer than expected.";
    }

    return error?.details?.message || error?.message || "Analysis failed. Please try again.";
  };

  const handleAnalyze = async () => {
    if (!validationState.isValid || isAnalyzing) return;

    // Check usage limits
    if (usageLimit && !usageLimit.allowed) {
      toast({
        title: "Usage limit reached",
        description: `You've used ${usageLimit.used} of ${usageLimit.limit} property imports this month. Upgrade your plan to continue.`,
        variant: "destructive",
      });
      navigate("/billing");
      return;
    }

    setIsAnalyzing(true);
    setDiagnostics({});

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

      // Queue the ingestion job
      setProgressStep("Queueing...");
      toast({ title: "📥 Queueing job...", description: "Adding to ingestion queue" });

      const { data, error } = await supabase.functions.invoke("queue-ingest", {
        body: { url: normalizedPreview || debouncedInput },
      });

      if (error) throw error;

      if (!data.ok) {
        const errorMessages: Record<string, string> = {
          unsupported_site: 'Try Zoopla, Rightmove, Zillow, Realtor, Redfin, ImmobilienScout24, SeLoger, or Idealista.',
          invalid_url: 'Please enter a valid URL.',
        };
        throw new Error(errorMessages[data.error] || data.error || 'Failed to queue job');
      }

      const jobId = data.jobId;
      setDiagnostics({ requestId: jobId });

      // Poll job status
      setProgressStep("Queued...");
      toast({ title: "⏱️ Job queued", description: "Waiting for processing" });

      let attempts = 0;
      const maxAttempts = 40; // 2 minutes at 3s intervals
      const pollInterval = setInterval(async () => {
        attempts++;

        if (attempts > maxAttempts) {
          clearInterval(pollInterval);
          toast({
            title: "Timeout",
            description: "Job is taking longer than expected. Check /admin/jobs for status.",
            variant: "destructive",
          });
          setIsAnalyzing(false);
          setProgressStep("");
          return;
        }

        const { data: jobData, error: jobError } = await supabase
          .from('ingest_jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (jobError) {
          console.error('Job fetch error:', jobError);
          return;
        }

        setDiagnostics({
          requestId: jobId,
          runId: jobData.run_id,
          datasetId: jobData.dataset_id,
        });

        if (jobData.status === 'running') {
          setProgressStep("Running actor...");
          toast({ title: "🚀 Processing...", description: "Scraping properties" });
        } else if (jobData.status === 'succeeded') {
          clearInterval(pollInterval);
          setProgressStep("Complete!");
          toast({
            title: "✅ Success",
            description: `Properties imported from ${jobData.site}`,
          });

          setTimeout(() => {
            navigate('/deals');
          }, 1500);
        } else if (jobData.status === 'failed') {
          clearInterval(pollInterval);
          const errorMsg = typeof jobData.error === 'object' && jobData.error !== null && 'message' in jobData.error 
            ? String(jobData.error.message) 
            : 'Ingestion failed';
          throw new Error(errorMsg);
        } else if (jobData.status === 'no_items') {
          clearInterval(pollInterval);
          throw new Error('No properties found. Try a different URL.');
        }
      }, 3000);
    } catch (err: any) {
      console.error("Analysis error:", err);
      const errorMessage = getErrorMessage(err);
      
      toast({
        title: "❌ Failed",
        description: errorMessage,
        variant: "destructive",
      });

      setProgressStep("");
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
          
          {usageLimit && (
            <Badge variant={usageLimit.allowed ? "outline" : "destructive"} className="mb-4">
              {usageLimit.limit === -1 
                ? "Unlimited imports" 
                : `${usageLimit.used}/${usageLimit.limit} imports used this month`}
            </Badge>
          )}

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
                  variant="secondary"
                  onClick={() => handleUseExample("zoopla")}
                  disabled={isAnalyzing}
                  title="Try Zoopla example"
                  className="text-xs px-2"
                >
                  Zoopla
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleUseExample("rightmove")}
                  disabled={isAnalyzing}
                  title="Try Rightmove example"
                  className="text-xs px-2"
                >
                  RM
                </Button>
              </div>
            </div>

            {/* Normalized URL Preview */}
            {normalizedPreview && normalizedPreview !== debouncedInput && (
              <div className="text-xs text-muted-foreground px-2 flex items-center gap-2">
                <Info className="h-3 w-3" />
                <span>Normalized: {normalizedPreview}</span>
              </div>
            )}

            {/* Validation Message */}
            {debouncedInput && validationState.message && (
              <div className={`flex items-center gap-2 text-sm ${validationState.isValid ? "text-green-600" : "text-amber-600"}`}>
                {validationState.isValid ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <span>{validationState.message}</span>
              </div>
            )}

            {/* Progress Indicator */}
            {isAnalyzing && progressStep && (
              <div className="text-sm text-primary flex items-center gap-2 animate-pulse">
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
                <span>{progressStep}</span>
              </div>
            )}

            {/* Diagnostics (if available) */}
            {(diagnostics.requestId || diagnostics.runId || diagnostics.datasetId) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="outline" onClick={copyDiagnostics} className="gap-2">
                      <Info className="h-3 w-3" />
                      <span className="text-xs">Diagnostics</span>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="text-xs space-y-1">
                      {diagnostics.requestId && <div>Request: {diagnostics.requestId.slice(0, 8)}...</div>}
                      {diagnostics.runId && <div>Run: {diagnostics.runId}</div>}
                      {diagnostics.datasetId && <div>Dataset: {diagnostics.datasetId}</div>}
                      <div className="text-muted-foreground pt-1">Click to copy full diagnostics</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
              <Button size="lg" variant="outline" className="text-lg border-2 hover:bg-accent/50 backdrop-blur-sm">
                Dashboard
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/deals">
              <Button size="lg" variant="outline" className="text-lg border-2 hover:bg-accent/50 backdrop-blur-sm">
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
