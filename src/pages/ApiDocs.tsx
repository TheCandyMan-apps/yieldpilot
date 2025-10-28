import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Code, Key, Lock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function ApiDocs() {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">API Documentation</h1>
          <p className="text-muted-foreground">
            Integrate YieldPilot data into your applications
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <Zap className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-base">Real-time Data</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Access up-to-date property listings and market insights
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <Lock className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-base">Secure Access</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                API keys with rate limiting and scope control
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <Code className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-base">RESTful API</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Simple HTTP requests with JSON responses
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Getting Started</CardTitle>
              <Button onClick={() => navigate('/api-keys')}>
                <Key className="h-4 w-4 mr-2" />
                Manage API Keys
              </Button>
            </div>
            <CardDescription>Follow these steps to start using the API</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">1</span>
                Create an API Key
              </h4>
              <p className="text-sm text-muted-foreground ml-8">
                Generate your API key from the API Keys page. Keep it secure!
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">2</span>
                Make Your First Request
              </h4>
              <div className="ml-8 bg-muted p-4 rounded-lg">
                <code className="text-sm font-mono">
                  curl https://api.yieldpilot.com/v1/deals \<br />
                  &nbsp;&nbsp;-H "Authorization: Bearer YOUR_API_KEY"
                </code>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">3</span>
                Parse the Response
              </h4>
              <p className="text-sm text-muted-foreground ml-8">
                All responses are JSON formatted with consistent schemas
              </p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="deals">
          <TabsList>
            <TabsTrigger value="deals">Deals</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
          </TabsList>

          <TabsContent value="deals" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">GET /v1/deals</CardTitle>
                  <Badge>Public</Badge>
                </div>
                <CardDescription>Retrieve property deals with optional filters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Query Parameters</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <code className="bg-muted px-2 py-1 rounded">region</code>
                      <span className="text-muted-foreground">Filter by region (UK, US, DE, ES, FR)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <code className="bg-muted px-2 py-1 rounded">min_yield</code>
                      <span className="text-muted-foreground">Minimum yield percentage</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <code className="bg-muted px-2 py-1 rounded">max_price</code>
                      <span className="text-muted-foreground">Maximum property price</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <code className="bg-muted px-2 py-1 rounded">limit</code>
                      <span className="text-muted-foreground">Number of results (default: 50, max: 100)</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Example Response</h4>
                  <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                    <pre className="text-sm font-mono">
{`{
  "deals": [
    {
      "id": "uuid",
      "address": "123 Main St",
      "city": "Manchester",
      "price": 250000,
      "bedrooms": 3,
      "net_yield": 7.5,
      "score": 85,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 150,
  "page": 1
}`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">GET /v1/metrics/:listingId</CardTitle>
                  <Badge>Authenticated</Badge>
                </div>
                <CardDescription>Get detailed metrics for a specific property</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Response Fields</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <code className="bg-muted px-2 py-1 rounded">gross_yield</code>
                      <span className="text-muted-foreground">Gross rental yield percentage</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <code className="bg-muted px-2 py-1 rounded">net_yield</code>
                      <span className="text-muted-foreground">Net yield after costs</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <code className="bg-muted px-2 py-1 rounded">cashflow</code>
                      <span className="text-muted-foreground">Monthly cashflow projection</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <code className="bg-muted px-2 py-1 rounded">roi</code>
                      <span className="text-muted-foreground">Return on investment percentage</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="benchmarks" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">GET /v1/benchmarks</CardTitle>
                  <Badge>Public</Badge>
                </div>
                <CardDescription>Regional market benchmarks and statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Get aggregated market data including average yields, prices, and growth rates by region.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle>Rate Limits</CardTitle>
            <CardDescription>API usage limits by tier</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b">
                <div>
                  <p className="font-medium">Free Tier</p>
                  <p className="text-sm text-muted-foreground">1,000 requests/hour</p>
                </div>
                <Badge variant="outline">Default</Badge>
              </div>
              <div className="flex items-center justify-between pb-3 border-b">
                <div>
                  <p className="font-medium">Pro Tier</p>
                  <p className="text-sm text-muted-foreground">10,000 requests/hour</p>
                </div>
                <Badge>Pro</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Enterprise</p>
                  <p className="text-sm text-muted-foreground">Custom limits</p>
                </div>
                <Badge variant="secondary">Contact us</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
