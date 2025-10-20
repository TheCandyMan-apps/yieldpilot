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
import { z } from "zod";

const propertyAnalysisSchema = z.object({
  propertyAddress: z.string()
    .trim()
    .min(1, "Property address is required")
    .max(500, "Property address must be less than 500 characters")
    .regex(/^[a-zA-Z0-9\s,.\-#']+$/, "Property address contains invalid characters"),
  propertyPrice: z.string()
    .refine((val) => !isNaN(parseFloat(val)), "Must be a valid number")
    .refine((val) => parseFloat(val) >= 1000, "Property price must be at least £1,000")
    .refine((val) => parseFloat(val) <= 100000000, "Property price must be less than £100,000,000"),
  propertyType: z.enum(["residential", "commercial", "mixed_use", "land"]),
  estimatedRent: z.string()
    .refine((val) => !isNaN(parseFloat(val)), "Must be a valid number")
    .refine((val) => parseFloat(val) >= 0, "Estimated rent must be positive")
    .refine((val) => parseFloat(val) <= 1000000, "Estimated rent must be less than £1,000,000"),
  mortgageRate: z.string()
    .refine((val) => !isNaN(parseFloat(val)), "Must be a valid number")
    .refine((val) => parseFloat(val) >= 0, "Mortgage rate must be positive")
    .refine((val) => parseFloat(val) <= 20, "Mortgage rate must be less than 20%"),
  depositAmount: z.string()
    .refine((val) => !isNaN(parseFloat(val)), "Must be a valid number")
    .refine((val) => parseFloat(val) >= 0, "Deposit amount must be positive"),
  monthlyCosts: z.string()
    .refine((val) => !isNaN(parseFloat(val)), "Must be a valid number")
    .refine((val) => parseFloat(val) >= 0, "Monthly costs must be positive")
    .refine((val) => parseFloat(val) <= 100000, "Monthly costs must be less than £100,000"),
}).refine((data) => parseFloat(data.depositAmount) <= parseFloat(data.propertyPrice), {
  message: "Deposit cannot exceed property price",
  path: ["depositAmount"],
});

interface PropertyAnalysisFormProps {
  onComplete: (analysis: any) => void;
  onCancel: () => void;
  existingAnalysis?: any;
}

const PropertyAnalysisForm = ({ onComplete, onCancel, existingAnalysis }: PropertyAnalysisFormProps) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
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
    setErrors({});
    
    // Validate form data
    const validation = propertyAnalysisSchema.safeParse(formData);
    
    if (!validation.success) {
      const newErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          newErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(newErrors);
      toast.error("Please fix the validation errors");
      return;
    }
    
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
      
      // Enhanced error messages for production
      let errorMessage = "Failed to analyze property";
      
      if (error?.message?.includes("rate limit") || error?.message?.includes("429")) {
        errorMessage = "Service is busy. Please wait a moment and try again.";
      } else if (error?.message?.includes("credit") || error?.message?.includes("402")) {
        errorMessage = "Service temporarily unavailable. Please contact support.";
      } else if (error?.message?.includes("auth")) {
        errorMessage = "Please sign in to analyze properties.";
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
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
              className={errors.propertyAddress ? "border-destructive" : ""}
            />
            {errors.propertyAddress && (
              <p className="text-xs text-destructive mt-1">{errors.propertyAddress}</p>
            )}
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
                className={errors.propertyPrice ? "border-destructive" : ""}
              />
              {errors.propertyPrice && (
                <p className="text-xs text-destructive mt-1">{errors.propertyPrice}</p>
              )}
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
                className={errors.estimatedRent ? "border-destructive" : ""}
              />
              {errors.estimatedRent && (
                <p className="text-xs text-destructive mt-1">{errors.estimatedRent}</p>
              )}
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
                className={errors.mortgageRate ? "border-destructive" : ""}
              />
              {errors.mortgageRate && (
                <p className="text-xs text-destructive mt-1">{errors.mortgageRate}</p>
              )}
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
                className={errors.depositAmount ? "border-destructive" : ""}
              />
              {errors.depositAmount && (
                <p className="text-xs text-destructive mt-1">{errors.depositAmount}</p>
              )}
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
                className={errors.monthlyCosts ? "border-destructive" : ""}
              />
              {errors.monthlyCosts && (
                <p className="text-xs text-destructive mt-1">{errors.monthlyCosts}</p>
              )}
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