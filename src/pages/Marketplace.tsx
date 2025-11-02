import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Star, MapPin, Phone, Mail, TrendingUp, Briefcase, Home, Scale, Wrench } from "lucide-react";

const PROVIDER_TYPES = [
  { value: "broker", label: "Brokers", icon: Briefcase },
  { value: "property_manager", label: "Property Managers", icon: Home },
  { value: "mortgage_broker", label: "Mortgage Brokers", icon: TrendingUp },
  { value: "solicitor", label: "Solicitors", icon: Scale },
  { value: "contractor", label: "Contractors", icon: Wrench },
];

export default function Marketplace() {
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState("broker");
  const [searchQuery, setSearchQuery] = useState("");
  const [region, setRegion] = useState("");

  useEffect(() => {
    searchProviders();
  }, [selectedType, region]);

  const searchProviders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("marketplace-match", {
        body: { 
          provider_type: selectedType,
          region: region || undefined,
        },
      });

      if (error) throw error;
      setProviders(data.providers || []);
    } catch (error: any) {
      console.error("Error searching providers:", error);
      toast.error("Failed to load service providers");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReferral = async (providerId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("create-referral", {
        body: {
          provider_id: providerId,
          referral_type: "inquiry",
        },
      });

      if (error) throw error;
      
      toast.success("Referral created! You'll receive a rebate when the deal completes.", {
        description: `Contact: ${data.referral.provider.email}`,
      });
    } catch (error: any) {
      console.error("Error creating referral:", error);
      toast.error(error.message || "Failed to create referral");
    }
  };

  const filteredProviders = searchQuery
    ? providers.filter(p => 
        p.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : providers;

  return (
    <DashboardLayout>
      <Helmet>
        <title>Service Provider Marketplace | YieldPilot</title>
        <meta name="description" content="Connect with vetted brokers, property managers, mortgage brokers, solicitors and contractors. Earn rebates on successful referrals." />
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Service Provider Marketplace</h1>
          <p className="text-muted-foreground mt-1">
            Connect with vetted professionals and earn rebates on successful referrals
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search providers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Region (optional)"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full md:w-48"
              />
              <Button onClick={searchProviders}>Search</Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredProviders.map((provider) => {
              const TypeIcon = PROVIDER_TYPES.find(t => t.value === provider.provider_type)?.icon || Briefcase;
              
              return (
                <Card key={provider.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <TypeIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">{provider.company_name}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            {provider.contact_name && <span>{provider.contact_name}</span>}
                            {provider.rating && (
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span>{provider.rating.toFixed(1)}</span>
                              </div>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={
                        provider.listing_tier === 'premium' ? 'default' :
                        provider.listing_tier === 'featured' ? 'secondary' :
                        'outline'
                      }>
                        {provider.listing_tier}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {provider.description && (
                      <p className="text-sm text-muted-foreground">{provider.description}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-2">
                      {provider.regions?.map((r: string) => (
                        <Badge key={r} variant="outline">
                          <MapPin className="h-3 w-3 mr-1" />
                          {r}
                        </Badge>
                      ))}
                    </div>

                    {provider.specialties && provider.specialties.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Specialties:</p>
                        <div className="flex flex-wrap gap-2">
                          {provider.specialties.map((s: string, idx: number) => (
                            <Badge key={idx} variant="secondary">{s}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        {provider.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {provider.phone}
                          </span>
                        )}
                        {provider.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {provider.email}
                          </span>
                        )}
                      </div>
                      <Button onClick={() => handleCreateReferral(provider.id)}>
                        Connect & Earn Rebate
                      </Button>
                    </div>

                    {provider.match_score && (
                      <p className="text-xs text-muted-foreground">
                        Match Score: {provider.match_score}/100
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {filteredProviders.length === 0 && !loading && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No providers found matching your criteria</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
