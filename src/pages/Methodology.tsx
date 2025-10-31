import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DashboardLayout from '@/components/DashboardLayout';

export default function Methodology() {
  return (
    <DashboardLayout>
      <Helmet>
        <title>Investment Methodology - YieldPilot</title>
        <meta name="description" content="Learn about YieldPilot's data-driven investment methodology, scoring algorithms, and property analysis framework." />
        <meta property="og:title" content="Investment Methodology - YieldPilot" />
        <meta property="og:description" content="Transparent, data-driven property investment analysis powered by multi-region data ingestion and AI-enhanced scoring." />
        <meta property="og:type" content="article" />
        <link rel="canonical" href="https://yieldpilot.com/methodology" />
      </Helmet>

      <div className="container mx-auto py-8 space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-4">Investment Methodology</h1>
          <p className="text-lg text-muted-foreground">
            Transparent, data-driven property investment analysis powered by global market intelligence
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Data Ingestion & Normalization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              YieldPilot aggregates property listings from multiple markets (UK, US, ES) through provider-specific adapters. 
              Each listing is normalized to a canonical schema with standardized fields: location, price, currency, property type, 
              size metrics, and source provenance.
            </p>
            <h3 className="font-semibold mt-4">Multi-Region Coverage</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>UK:</strong> Rightmove, Zoopla via Apify</li>
              <li><strong>US:</strong> Realtor.com, Redfin, Zillow</li>
              <li><strong>ES:</strong> Idealista, Fotocasa</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scoring Algorithm</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>Each listing receives a composite score (0–100) and band (A–E) based on:</p>
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold">1. Gross Yield (35 points)</h4>
                <p className="text-sm text-muted-foreground">
                  ≥8% = Excellent | 6–8% = Good | 4–6% = Fair | &lt;4% = Poor
                </p>
              </div>
              <div>
                <h4 className="font-semibold">2. Net Yield (30 points)</h4>
                <p className="text-sm text-muted-foreground">
                  ≥6% = Excellent | 4–6% = Good | 2–4% = Fair | &lt;2% = Poor
                </p>
              </div>
              <div>
                <h4 className="font-semibold">3. Price Efficiency (20 points)</h4>
                <p className="text-sm text-muted-foreground">
                  &lt;£3k/m² = Excellent | £3k–5k/m² = Good | &gt;£5k/m² = Fair
                </p>
              </div>
              <div>
                <h4 className="font-semibold">4. Market Velocity (15 points)</h4>
                <p className="text-sm text-muted-foreground">
                  ≤7 days = Hot | 8–30 days = Normal | &gt;30 days = Stale
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>FX Normalization</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              All listings include generated columns for <code>price_usd</code> and <code>price_eur</code> using 
              hourly-refreshed foreign exchange rates from the <code>fx_rates</code> table. This enables cross-border 
              comparisons and portfolio aggregation regardless of native currency.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Regional Defaults</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Region</th>
                  <th className="text-right py-2">Operating Exp %</th>
                  <th className="text-right py-2">Vacancy %</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2">UK (GB)</td>
                  <td className="text-right">25%</td>
                  <td className="text-right">5%</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">US</td>
                  <td className="text-right">30%</td>
                  <td className="text-right">8%</td>
                </tr>
                <tr>
                  <td className="py-2">Spain (ES)</td>
                  <td className="text-right">20%</td>
                  <td className="text-right">6%</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
