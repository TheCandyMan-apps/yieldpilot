import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText } from "lucide-react";

interface PurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productType: 'ai_lease_report' | 'due_diligence_pack' | 'full_report';
  metadata?: Record<string, any>;
}

const PRODUCT_INFO = {
  ai_lease_report: {
    name: "AI Lease Report",
    description: "Comprehensive AI-powered analysis of your lease document",
    price: "$49",
    priceId: "price_ai_lease_report_placeholder",
    features: [
      "Ground rent escalation analysis",
      "Onerous clause detection",
      "Underletting restriction review",
      "Service charge analysis",
      "PDF report delivery",
    ],
  },
  due_diligence_pack: {
    name: "Due Diligence Pack",
    description: "Complete property due diligence package",
    price: "$99",
    priceId: "price_due_diligence_pack_placeholder",
    features: [
      "Property valuation report",
      "Market analysis",
      "Legal compliance check",
      "Risk assessment",
      "Investment recommendation",
    ],
  },
  full_report: {
    name: "Full Investment Report",
    description: "Complete property investment analysis with detailed metrics",
    price: "£29",
    priceId: "price_full_report_placeholder",
    features: [
      "Detailed risk analysis",
      "Comparable properties",
      "5-year forecast",
      "PDF download",
      "No watermark",
    ],
  },
};

export function PurchaseDialog({ open, onOpenChange, productType, metadata = {} }: PurchaseDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const product = PRODUCT_INFO[productType];

  async function handlePurchase() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: product.priceId,
          quantity: 1,
          mode: 'payment',
          metadata: {
            product_type: productType,
            ...metadata,
          },
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        onOpenChange(false);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to initiate checkout",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {product.name}
          </DialogTitle>
          <DialogDescription>{product.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <div className="text-3xl font-bold mb-2">{product.price}</div>
            <div className="text-sm text-muted-foreground">One-time purchase</div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">What's included:</h4>
            <ul className="space-y-2">
              {product.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <Button 
            onClick={handlePurchase} 
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Purchase for ${product.price}`
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Secure payment processed by Stripe. You'll receive your report via email within 24 hours.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
