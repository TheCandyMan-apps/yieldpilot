import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface PropertyAnalysisFormProps {
  onComplete: (analysis: any) => void;
  onCancel: () => void;
  existingAnalysis?: any;
}

const PropertyAnalysisForm = ({ onComplete, onCancel, existingAnalysis }: PropertyAnalysisFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    propertyAddress: existingAnalysis?.property_address || "",
    propertyPrice: existingAnalysis?.property_price?.toString() || "",
    propertyType: existingAnalysis?.property_type || "residential",
    estimatedRent: existingAnalysis?.estimated_rent?.toString() || "",
    mortgageRate: existingAnalysis?.mortgage_rate?.toString() || "",
    depositAmount: existingAnalysis?.deposit_amount?.toString() || "",
    monthlyCosts: existingAnalysis?.monthly_costs?.toString() || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-property", {
        body: {
          analysisId: existingAnalysis?.id,
          propertyAddress: formData.propertyAddress,
          propertyPrice: parseFloat(formData.propertyPrice),
          propertyType: formData.propertyType,
          estimatedRent: parseFloat(formData.estimatedRent),
          mortgageRate: parseFloat(formData.mortgageRate),
          depositAmount: parseFloat(formData.depositAmount),
          monthlyCosts: parseFloat(formData.monthlyCosts),
        },
      });

      if (error) throw error;

      onComplete(data);
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast.error(error.message || "Failed to analyze property");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {existingAnalysis ? "Edit Property Analysis" : "Property Analysis"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="address">Property Address</Label>
            <Input
              id="address"
              placeholder="123 Main Street, London, UK"
              value={formData.propertyAddress}
              onChange={(e) => handleChange("propertyAddress", e.target.value)}
              required
              aria-describedby="address-hint"
            />
            <span id="address-hint" className="sr-only">Enter the full property address including street, city, and postcode</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Purchase Price (£)</Label>
              <Input
                id="price"
                type="number"
                placeholder="250000"
                value={formData.propertyPrice}
                onChange={(e) => handleChange("propertyPrice", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Property Type</Label>
              <Select
                value={formData.propertyType}
                onValueChange={(value) => handleChange("propertyType", value)}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="mixed_use">Mixed Use</SelectItem>
                  <SelectItem value="land">Land</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rent">Estimated Monthly Rent (£)</Label>
              <Input
                id="rent"
                type="number"
                placeholder="1200"
                value={formData.estimatedRent}
                onChange={(e) => handleChange("estimatedRent", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mortgage">Mortgage Rate (%)</Label>
              <Input
                id="mortgage"
                type="number"
                step="0.01"
                placeholder="4.5"
                value={formData.mortgageRate}
                onChange={(e) => handleChange("mortgageRate", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deposit">Deposit Amount (£)</Label>
              <Input
                id="deposit"
                type="number"
                placeholder="50000"
                value={formData.depositAmount}
                onChange={(e) => handleChange("depositAmount", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="costs">Monthly Costs (£)</Label>
              <Input
                id="costs"
                type="number"
                placeholder="200"
                value={formData.monthlyCosts}
                onChange={(e) => handleChange("monthlyCosts", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {existingAnalysis ? "Update Analysis" : "Analyze Property"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default PropertyAnalysisForm;