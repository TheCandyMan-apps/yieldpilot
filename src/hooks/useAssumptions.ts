import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Assumptions {
  deposit_pct: number;
  apr: number;
  term_years: number;
  interest_only: boolean;
  voids_pct: number;
  maintenance_pct: number;
  management_pct: number;
  insurance_annual: number;
}

const DEFAULT_ASSUMPTIONS: Assumptions = {
  deposit_pct: 25,
  apr: 5.5,
  term_years: 25,
  interest_only: true,
  voids_pct: 5,
  maintenance_pct: 8,
  management_pct: 10,
  insurance_annual: 300,
};

export const useAssumptions = (listingId?: string) => {
  const [assumptions, setAssumptions] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAssumptions();
  }, [listingId]);

  const loadAssumptions = async () => {
    setLoading(true);
    try {
      // First, try to load deal-specific assumptions
      if (listingId) {
        const { data: metrics } = await supabase
          .from("listing_metrics")
          .select("assumptions")
          .eq("listing_id", listingId)
          .maybeSingle();

        if (metrics?.assumptions) {
          setAssumptions(metrics.assumptions as unknown as Assumptions);
          setLoading(false);
          return;
        }
      }

      // Otherwise, load user defaults
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("default_assumptions")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.default_assumptions) {
          setAssumptions(profile.default_assumptions as unknown as Assumptions);
          setLoading(false);
          return;
        }
      }

      // Fallback to defaults
      setAssumptions(DEFAULT_ASSUMPTIONS);
    } catch (error) {
      console.error("Error loading assumptions:", error);
      toast({
        title: "Error loading assumptions",
        description: "Using default values",
        variant: "destructive",
      });
      setAssumptions(DEFAULT_ASSUMPTIONS);
    } finally {
      setLoading(false);
    }
  };

  const saveAssumptions = async (newAssumptions: Assumptions, saveAsDefault = false) => {
    try {
      // Save to deal if listingId is provided
      if (listingId) {
        const { error } = await supabase
          .from("listing_metrics")
          .upsert({
            listing_id: listingId,
            assumptions: newAssumptions as any,
            updated_at: new Date().toISOString(),
          } as any);

        if (error) throw error;
      }

      // Save as user default if requested
      if (saveAsDefault) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error } = await supabase
            .from("profiles")
            .update({ default_assumptions: newAssumptions as any })
            .eq("id", user.id);

          if (error) throw error;

          toast({
            title: "Saved as default",
            description: "These assumptions will be used for new deals",
          });
        }
      }

      setAssumptions(newAssumptions);
      return true;
    } catch (error) {
      console.error("Error saving assumptions:", error);
      toast({
        title: "Error saving assumptions",
        description: "Please try again",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    assumptions,
    loading,
    saveAssumptions,
    reloadAssumptions: loadAssumptions,
  };
};

