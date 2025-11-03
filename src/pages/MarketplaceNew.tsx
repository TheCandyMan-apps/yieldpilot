import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Star, MapPin, Phone, Mail, Globe, Briefcase, TrendingUp, Award } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const PROVIDER_TYPES = [
  { value: "broker", label: "Property Brokers", icon: Briefcase },
  { value: "property_manager", label: "Property Managers", icon: TrendingUp },
  { value: "contractor", label: "Contractors", icon: Award },
  { value: "solicitor", label: "Solicitors", icon: Briefcase },
  { value: "mortgage_advisor", label: "Mortgage Advisors", icon: TrendingUp },
  { value: "surveyor", label: "Surveyors", icon: Award },
];

export default function MarketplaceNew() {
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [region, setRegion] = useState("");
  const [showBecomeProvider, setShowBecomeProvider] = useState(false);

  useEffect(() => {
    loadProviders();
  }, [selectedType, region]);

  const loadProviders = async () => {
    try {
      setLoading(true);
      let query = supabase.from("service_providers" as any).select("*");

      if (selectedType !== "all") {
        query = query.eq("provider_type", selectedType);
      }

      if (region) {
        query = query.ilike("region", `%${region}%`);
      }

      query = query.order("is_featured", { ascending: false })
                   .order("rating", { ascending: false, nullsFirst: false });

      const { data, error } = await query;

      if (error) throw error;
      setProviders(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading providers",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReferral = async (providerId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to create a referral",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from("referrals" as any)
        .insert([{
          user_id: user.id,
          provider_id: providerId,
          referral_type: "marketplace",
          status: "pending",
        }])
        .select();

      if (error) throw error;

      toast({
        title: "Referral created",
        description: "The provider will contact you shortly. You'll earn a rebate when this deal completes.",
      });
    } catch (error: any) {
      toast({
        title: "Error creating referral",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredProviders = providers.filter((provider) =>
    provider.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    provider.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <Helmet>
        <title>Service Provider Marketplace | YieldPilot</title>
        <meta name="description" content="Connect with verified property brokers, managers, and contractors. Get expert help for your investment journey." />
      </Helmet>

      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Service Provider Marketplace</h1>
            <p className="text-muted-foreground">
              Connect with trusted professionals. Earn rebates on successful referrals.
            </p>
          </div>
          <Dialog open={showBecomeProvider} onOpenChange={setShowBecomeProvider}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Award className="mr-2 h-4 w-4" />
                Become a Provider
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Join Our Marketplace</DialogTitle>
                <DialogDescription>
                  Get featured and reach thousands of property investors. £149/month for premium placement.
                </DialogDescription>
              </DialogHeader>
              <BecomeProviderForm onSuccess={() => setShowBecomeProvider(false)} />
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Search</Label>
                <Input
                  placeholder="Search providers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div>
                <Label>Provider Type</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {PROVIDER_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Region</Label>
                <Input
                  placeholder="e.g. London, Manchester..."
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : filteredProviders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No providers found matching your criteria.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders.map((provider) => (
              <Card key={provider.id} className={provider.is_featured ? "border-primary shadow-lg" : ""}>
                <CardHeader>
                  {provider.is_featured && (
                    <Badge className="w-fit mb-2" variant="default">
                      ⭐ Featured
                    </Badge>
                  )}
                  <CardTitle className="flex items-start justify-between">
                    <span>{provider.company_name}</span>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    {provider.rating && (
                      <div className="flex items-center">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="ml-1 font-medium">{provider.rating.toFixed(1)}</span>
                        <span className="ml-1 text-xs">({provider.review_count})</span>
                      </div>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Badge variant="secondary">{PROVIDER_TYPES.find(t => t.value === provider.provider_type)?.label}</Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {provider.description || "Professional service provider"}
                  </p>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{provider.region}</span>
                    </div>
                    {provider.contact_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{provider.contact_phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{provider.contact_email}</span>
                    </div>
                    {provider.website_url && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <a href={provider.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                          Website
                        </a>
                      </div>
                    )}
                  </div>

                  {provider.total_referrals > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        {provider.total_referrals} successful referrals
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={() => handleCreateReferral(provider.id)}
                    className="w-full"
                  >
                    Contact & Earn Rebate
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function BecomeProviderForm({ onSuccess }: { onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    company_name: "",
    provider_type: "",
    description: "",
    region: "",
    contact_email: "",
    contact_phone: "",
    website_url: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to create a provider listing",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("service_providers" as any).insert([{
        ...formData,
        user_id: user.id,
      }]);

      if (error) throw error;

      toast({
        title: "Provider listing created",
        description: "Your listing is now live! Upgrade to featured for premium placement.",
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error creating listing",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="company_name">Company Name *</Label>
        <Input
          id="company_name"
          required
          value={formData.company_name}
          onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="provider_type">Provider Type *</Label>
        <Select
          value={formData.provider_type}
          onValueChange={(value) => setFormData({ ...formData, provider_type: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {PROVIDER_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="region">Region *</Label>
          <Input
            id="region"
            required
            placeholder="e.g. London"
            value={formData.region}
            onChange={(e) => setFormData({ ...formData, region: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="contact_phone">Phone</Label>
          <Input
            id="contact_phone"
            type="tel"
            value={formData.contact_phone}
            onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="contact_email">Contact Email *</Label>
        <Input
          id="contact_email"
          type="email"
          required
          value={formData.contact_email}
          onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="website_url">Website URL</Label>
        <Input
          id="website_url"
          type="url"
          value={formData.website_url}
          onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
        />
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Create Listing
      </Button>
    </form>
  );
}
