import Header from "@/components/Header";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import TrustStats from "@/components/TrustStats";
import Testimonials from "@/components/Testimonials";
import CaseStudies from "@/components/CaseStudies";
import ROICalculator from "@/components/ROICalculator";
import ComparisonTable from "@/components/ComparisonTable";
import MarketInsights from "@/components/MarketInsights";
import Resources from "@/components/Resources";
import FAQ from "@/components/FAQ";
import Newsletter from "@/components/Newsletter";
import Pricing from "@/components/Pricing";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <Hero />
        <TrustStats />
        <About />
        <HowItWorks />
        <Features />
        <ROICalculator />
        <ComparisonTable />
        <CaseStudies />
        <Testimonials />
        <MarketInsights />
        <Resources />
        <Pricing />
        <FAQ />
        <Newsletter />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
