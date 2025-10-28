import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RegionalSettings {
  region: string;
  currency: string;
  locale: string;
  taxRate: number;
  maintenanceRate: number;
  insuranceRate: number;
  mortgageDeductible: boolean;
  closingCostsPct: number;
}

export function useRegionalSettings() {
  const [settings, setSettings] = useState<RegionalSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const preferredRegion = localStorage.getItem('preferred-region') || 'UK';
      
      const { data, error } = await supabase
        .from('regional_parameters')
        .select('*')
        .eq('region', preferredRegion)
        .single();

      if (error) throw error;

      setSettings({
        region: data.region,
        currency: data.currency,
        locale: data.locale,
        taxRate: Number(data.property_tax_pct),
        maintenanceRate: Number(data.maintenance_pct),
        insuranceRate: Number(data.insurance_pct),
        mortgageDeductible: data.mortgage_interest_deductible,
        closingCostsPct: Number(data.closing_costs_pct),
      });
    } catch (error) {
      console.error('Error fetching regional settings:', error);
    } finally {
      setLoading(false);
    }
  };

  return { settings, loading, refetch: fetchSettings };
}
