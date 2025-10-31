import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import * as Sentry from "@sentry/react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";
import { MobileNav } from "@/components/MobileNav";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { OnboardingTour } from "@/components/OnboardingTour";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Lazy load heavy routes for better performance
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Deals = lazy(() => import("./pages/Deals"));
const DealsV2 = lazy(() => import("./pages/DealsV2"));
const SyncProgress = lazy(() => import("./pages/SyncProgress"));
const Simulator = lazy(() => import("./pages/Simulator"));
const Insights = lazy(() => import("./pages/Insights"));
const AreaInsights = lazy(() => import("./pages/AreaInsights"));
const InvestorProfile = lazy(() => import("./pages/InvestorProfile"));
const Alerts = lazy(() => import("./pages/Alerts"));
const PortfolioNew = lazy(() => import("./pages/PortfolioNew"));
const PortfolioDetail = lazy(() => import("./pages/PortfolioDetail"));
const DealDetail = lazy(() => import("./pages/DealDetail"));
const Community = lazy(() => import("./pages/Community"));
const Billing = lazy(() => import("./pages/Billing"));
const Install = lazy(() => import("./pages/Install"));
const ApifyDebug = lazy(() => import("./pages/ApifyDebug"));
const AdminJobs = lazy(() => import("./pages/AdminJobs"));
const SavedSearches = lazy(() => import("./pages/SavedSearches"));
const Organizations = lazy(() => import("./pages/Organizations"));
const ApiKeys = lazy(() => import("./pages/ApiKeys"));
const Benchmarks = lazy(() => import("./pages/Benchmarks"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const InvestorNetwork = lazy(() => import("./pages/InvestorNetwork"));
const OffMarket = lazy(() => import("./pages/OffMarket"));
const ApiDocs = lazy(() => import("./pages/ApiDocs"));
const ForecastUsage = lazy(() => import("./pages/ForecastUsage"));
const AITelemetry = lazy(() => import("./pages/AITelemetry"));
const AIAssistant = lazy(() => import("./pages/AIAssistant"));
const Integrations = lazy(() => import("./pages/Integrations"));
const Watchlist = lazy(() => import("./pages/Watchlist"));
const Pipeline = lazy(() => import("./pages/Pipeline"));
const Blog = lazy(() => import("./pages/Blog"));
const Methodology = lazy(() => import("./pages/Methodology"));
const AdjustedRoiMethodology = lazy(() => import("./pages/methodology/AdjustedRoi"));
const InvestCityPage = lazy(() => import("./pages/seo/InvestCityPage"));
const LeaseScanner = lazy(() => import("./pages/LeaseScanner"));
const Enfranchisement = lazy(() => import("./pages/Enfranchisement"));
const StressTesting = lazy(() => import("./pages/StressTesting"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sentry.ErrorBoundary 
        fallback={({ error, resetError }) => (
          <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="max-w-md w-full space-y-4 text-center">
              <h1 className="text-2xl font-bold text-destructive">Something went wrong</h1>
              <p className="text-muted-foreground">
                {error instanceof Error ? error.message : 'An unexpected error occurred'}
              </p>
              <div className="flex gap-4 justify-center">
                <button onClick={resetError} className="px-4 py-2 bg-primary text-primary-foreground rounded-md">
                  Try again
                </button>
                <button onClick={() => window.location.href = '/'} className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md">
                  Go home
                </button>
              </div>
            </div>
          </div>
        )}
        showDialog
      >
        <Toaster />
        <Sonner />
        <PWAUpdatePrompt />
        <KeyboardShortcuts />
        <OnboardingTour />
        <BrowserRouter>
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>}>
            <MobileNav />
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/deals-v2" element={<DealsV2 />} />
          <Route path="/sync-progress" element={<SyncProgress />} />
            <Route path="/simulator" element={<Simulator />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/area-insights" element={<AreaInsights />} />
            <Route path="/investor-profile" element={<InvestorProfile />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/portfolio" element={<PortfolioNew />} />
            <Route path="/portfolio/:id" element={<PortfolioDetail />} />
            <Route path="/deal/:id" element={<DealDetail />} />
            <Route path="/benchmarks" element={<Benchmarks />} />
        <Route path="/methodology" element={<Methodology />} />
        <Route path="/methodology/adjusted-roi" element={<AdjustedRoiMethodology />} />
        <Route path="/invest/:country/:city" element={<InvestCityPage />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/network" element={<InvestorNetwork />} />
            <Route path="/offmarket" element={<OffMarket />} />
            <Route path="/community" element={<Community />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/checkout-success" element={<CheckoutSuccess />} />
            <Route path="/install" element={<Install />} />
            <Route path="/debug/apify" element={<ApifyDebug />} />
            <Route path="/admin/jobs" element={<AdminJobs />} />
            <Route path="/saved-searches" element={<SavedSearches />} />
            <Route path="/organizations" element={<Organizations />} />
            <Route path="/api-keys" element={<ApiKeys />} />
            <Route path="/api-docs" element={<ApiDocs />} />
            <Route path="/forecast-usage" element={<ForecastUsage />} />
            <Route path="/ai-telemetry" element={<AITelemetry />} />
            <Route path="/ai-assistant" element={<AIAssistant />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/lease-scanner" element={<LeaseScanner />} />
            <Route path="/enfranchisement" element={<Enfranchisement />} />
            <Route path="/stress-testing/:id" element={<StressTesting />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </Sentry.ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
