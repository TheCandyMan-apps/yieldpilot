import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Brain, Target, TrendingUp, Home, Save } from "lucide-react";

interface InvestorProfile {
  preferred_yield_min: number;
  preferred_yield_max: number;
  risk_tolerance: string;
  location_preferences: string[];
  property_types: string[];
  refurb_comfort: string;
  max_budget: number | null;
  min_bedrooms: number;
  investment_strategy: string;
}

const InvestorProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<InvestorProfile>({
    preferred_yield_min: 6,
    preferred_yield_max: 12,
    risk_tolerance: "moderate",
    location_preferences: [],
    property_types: ["residential"],
    refurb_comfort: "light",
    max_budget: null,
    min_bedrooms: 1,
    investment_strategy: "buy_to_let"
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    await fetchProfile(session.user.id);
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("investor_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setProfile({
          preferred_yield_min: data.preferred_yield_min || 6,
          preferred_yield_max: data.preferred_yield_max || 12,
          risk_tolerance: data.risk_tolerance || "moderate",
          location_preferences: (data.location_preferences as string[]) || [],
          property_types: (data.property_types as string[]) || ["residential"],
          refurb_comfort: data.refurb_comfort || "light",
          max_budget: data.max_budget,
          min_bedrooms: data.min_bedrooms || 1,
          investment_strategy: data.investment_strategy || "buy_to_let"
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("investor_profiles")
        .upsert({
          user_id: session.user.id,
          ...profile
        });

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your investor preferences have been saved. YieldPilot will now personalize deal scores for you.",
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="h-8 w-8 text-primary" />
              Your Investor DNA
            </h1>
            <p className="text-muted-foreground mt-1">
              Personalize YieldPilot's AI to match your investment strategy
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving} size="lg">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Yield Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Yield Targets
              </CardTitle>
              <CardDescription>Define your preferred rental yield range</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Yield Range: {profile.preferred_yield_min}% - {profile.preferred_yield_max}%</Label>
                <div className="pt-2">
                  <Slider
                    min={4}
                    max={20}
                    step={0.5}
                    value={[profile.preferred_yield_min, profile.preferred_yield_max]}
                    onValueChange={([min, max]) => 
                      setProfile({ ...profile, preferred_yield_min: min, preferred_yield_max: max })
                    }
                    className="w-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Tolerance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Risk Profile
              </CardTitle>
              <CardDescription>How comfortable are you with investment risk?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Risk Tolerance</Label>
                <Select value={profile.risk_tolerance} onValueChange={(val) => setProfile({ ...profile, risk_tolerance: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Prefer safe, stable returns</SelectItem>
                    <SelectItem value="moderate">Moderate - Balanced approach</SelectItem>
                    <SelectItem value="high">High - Seeking maximum returns</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Refurbishment Comfort</Label>
                <Select value={profile.refurb_comfort} onValueChange={(val) => setProfile({ ...profile, refurb_comfort: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None - Move-in ready only</SelectItem>
                    <SelectItem value="light">Light - Cosmetic updates</SelectItem>
                    <SelectItem value="moderate">Moderate - Kitchen/bath refresh</SelectItem>
                    <SelectItem value="heavy">Heavy - Full renovation projects</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Investment Strategy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5 text-primary" />
                Strategy
              </CardTitle>
              <CardDescription>Your preferred investment approach</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Investment Strategy</Label>
                <Select value={profile.investment_strategy} onValueChange={(val) => setProfile({ ...profile, investment_strategy: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy_to_let">Buy to Let - Long-term rental</SelectItem>
                    <SelectItem value="brrr">BRRR - Buy, Refurb, Refinance, Rent</SelectItem>
                    <SelectItem value="flip">Flip - Buy low, sell high</SelectItem>
                    <SelectItem value="hmo">HMO - House in Multiple Occupation</SelectItem>
                    <SelectItem value="serviced_accommodation">Serviced Accommodation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Minimum Bedrooms</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={profile.min_bedrooms}
                  onChange={(e) => setProfile({ ...profile, min_bedrooms: parseInt(e.target.value) || 1 })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Budget */}
          <Card>
            <CardHeader>
              <CardTitle>Budget</CardTitle>
              <CardDescription>Set your maximum investment budget (optional)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Maximum Budget (£)</Label>
                <Input
                  type="number"
                  placeholder="No limit"
                  value={profile.max_budget || ""}
                  onChange={(e) => setProfile({ ...profile, max_budget: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Brain className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">AI Learning Engine Active</h3>
                <p className="text-sm text-muted-foreground">
                  YieldPilot learns from your interactions with deals. The more you use the platform, 
                  the better our AI becomes at finding opportunities that match your style. Deal scores 
                  are now personalized based on your preferences above.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default InvestorProfile;
