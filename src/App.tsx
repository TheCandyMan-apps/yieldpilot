import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Lazy load heavy routes for better performance
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Deals = lazy(() => import("./pages/Deals"));
const DealsV2 = lazy(() => import("./pages/DealsV2"));
const Simulator = lazy(() => import("./pages/Simulator"));
const Insights = lazy(() => import("./pages/Insights"));
const AreaInsights = lazy(() => import("./pages/AreaInsights"));
const InvestorProfile = lazy(() => import("./pages/InvestorProfile"));
const Alerts = lazy(() => import("./pages/Alerts"));
const PortfolioNew = lazy(() => import("./pages/PortfolioNew"));
const Community = lazy(() => import("./pages/Community"));
const Billing = lazy(() => import("./pages/Billing"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/deals-v2" element={<DealsV2 />} />
            <Route path="/simulator" element={<Simulator />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/area-insights" element={<AreaInsights />} />
            <Route path="/investor-profile" element={<InvestorProfile />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/portfolio" element={<PortfolioNew />} />
            <Route path="/community" element={<Community />} />
            <Route path="/billing" element={<Billing />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
