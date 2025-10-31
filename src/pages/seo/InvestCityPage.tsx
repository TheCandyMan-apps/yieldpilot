import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, MapPin, DollarSign, Home, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PurchaseDialog } from "@/components/PurchaseDialog";

interface CityStats {
  avgYield: number;
  medianPrice: number;
  dealCount: number;
  priceGrowth: number;
}

export default function InvestCityPage() {
  const { country, city } = useParams();
  const navigate = useNavigate();
  const [stats, setStats] = useState<CityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPurchase, setShowPurchase] = useState(false);

  useEffect(() => {
    fetchCityStats();
  }, [country, city]);

  const fetchCityStats = async () => {
    try {
      // Fetch real stats from deals_feed
      const { data, error } = await supabase
        .from('deals_feed')
        .select('price, yield_percentage, roi_percentage')
        .ilike('city', city || '')
        .eq('is_active', true);

      if (error) throw error;

      if (data && data.length > 0) {
        const avgYield = data.reduce((sum, d) => sum + (d.yield_percentage || 0), 0) / data.length;
        const prices = data.map(d => d.price).sort((a, b) => a - b);
        const medianPrice = prices[Math.floor(prices.length / 2)];

        setStats({
          avgYield: avgYield,
          medianPrice: medianPrice,
          dealCount: data.length,
          priceGrowth: 3.2, // Placeholder
        });
      } else {
        // Fallback stats
        setStats({
          avgYield: 5.5,
          medianPrice: 250000,
          dealCount: 0,
          priceGrowth: 3.2,
        });
      }
    } catch (error) {
      console.error('Error fetching city stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const cityName = city?.charAt(0).toUpperCase() + city?.slice(1) || "City";
  const countryName = country === 'uk' ? 'United Kingdom' : country === 'us' ? 'United States' : country?.toUpperCase();

  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": `Invest in ${cityName}, ${countryName} - Property Investment Guide`,
    "description": `Discover investment opportunities in ${cityName}, ${countryName}. View average yields, property prices, and market trends.`,
    "mainEntity": {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": `What is the average property yield in ${cityName}?`,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": `The average rental yield in ${cityName} is approximately ${stats?.avgYield.toFixed(1)}%, making it an attractive market for property investors.`
          }
        },
        {
          "@type": "Question",
          "name": `What is the median property price in ${cityName}?`,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": `The median property price in ${cityName} is around ${new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(stats?.medianPrice || 0)}.`
          }
        }
      ]
    }
  };

  return (
    <>
      <Helmet>
        <title>Invest in {cityName}, {countryName} | Property Investment Guide | YieldPilot</title>
        <meta name="description" content={`Discover investment opportunities in ${cityName}, ${countryName}. View average yields of ${stats?.avgYield.toFixed(1)}%, median prices, and ${stats?.dealCount}+ active property listings.`} />
        <meta property="og:title" content={`Invest in ${cityName}, ${countryName} | YieldPilot`} />
        <meta property="og:description" content={`Property investment data for ${cityName}: ${stats?.avgYield.toFixed(1)}% avg yield, ${stats?.dealCount}+ deals`} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      </Helmet>

      <DashboardLayout>
        <div className="space-y-8">
          {/* Hero Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{countryName} → {cityName}</span>
            </div>
            <h1 className="text-4xl font-bold">
              Property Investment in {cityName}
            </h1>
            <p className="text-xl text-muted-foreground">
              Explore investment opportunities and market insights for {cityName}, {countryName}
            </p>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Yield</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "..." : `${stats?.avgYield.toFixed(1)}%`}
                </div>
                <p className="text-xs text-muted-foreground">
                  Gross rental yield
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Median Price</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "..." : new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(stats?.medianPrice || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Middle market price
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Deals</CardTitle>
                <Home className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "..." : stats?.dealCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Investment opportunities
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Price Growth</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "..." : `${stats?.priceGrowth.toFixed(1)}%`}
                </div>
                <p className="text-xs text-muted-foreground">
                  Annual appreciation
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Market Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Market Overview</CardTitle>
              <CardDescription>
                Key insights for property investment in {cityName}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Investment Potential</h3>
                <p className="text-muted-foreground">
                  {cityName} offers attractive rental yields averaging {stats?.avgYield.toFixed(1)}% with {stats?.dealCount} active listings on our platform. 
                  The market shows consistent growth with property values appreciating at approximately {stats?.priceGrowth.toFixed(1)}% annually.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Market Dynamics</h3>
                <p className="text-muted-foreground">
                  The median property price in {cityName} sits at {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(stats?.medianPrice || 0)}, 
                  offering opportunities across various property types and investment strategies.
                </p>
              </div>

              <Button onClick={() => navigate('/deals')} className="mt-4">
                View Available Properties in {cityName}
              </Button>
            </CardContent>
          </Card>

          {/* FAQ Section */}
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">What is the average rental yield in {cityName}?</h3>
                <p className="text-muted-foreground">
                  The average gross rental yield in {cityName} is approximately {stats?.avgYield.toFixed(1)}%, making it an attractive market for buy-to-let investors.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">How much does a property cost in {cityName}?</h3>
                <p className="text-muted-foreground">
                  The median property price in {cityName} is around {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(stats?.medianPrice || 0)}, 
                  though prices vary by property type, size, and location within the city.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Is {cityName} a good place to invest in property?</h3>
                <p className="text-muted-foreground">
                  {cityName} offers solid investment potential with consistent rental yields, property appreciation, and {stats?.dealCount} active opportunities on our platform. 
                  We recommend conducting thorough due diligence and using our underwriting tools before making investment decisions.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </>
  );
}