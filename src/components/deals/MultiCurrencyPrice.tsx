import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrencyLocalized, convertCurrency } from '@/lib/finance/conversions';
import { useRegionalSettings } from '@/lib/hooks/useRegionalSettings';

interface MultiCurrencyPriceProps {
  amount: number;
  sourceCurrency: string;
  sourceRegion?: string;
  className?: string;
}

export function MultiCurrencyPrice({ 
  amount, 
  sourceCurrency, 
  sourceRegion,
  className = "" 
}: MultiCurrencyPriceProps) {
  const { settings } = useRegionalSettings();
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [fxRate, setFxRate] = useState<number | null>(null);

  useEffect(() => {
    const fetchConversion = async () => {
      if (!settings || settings.currency === sourceCurrency) {
        setConvertedAmount(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('fx_rates')
          .select('*')
          .eq('base', sourceCurrency)
          .eq('target', settings.currency)
          .single();

        if (error) throw error;

        if (data) {
          const converted = await convertCurrency(
            amount, 
            sourceCurrency, 
            settings.currency,
            [data]
          );
          setConvertedAmount(converted);
          setFxRate(data.rate);
        }
      } catch (error) {
        console.error('FX conversion error:', error);
      }
    };

    fetchConversion();
  }, [amount, sourceCurrency, settings]);

  const primaryPrice = formatCurrencyLocalized(amount, sourceCurrency, sourceRegion || 'en-GB');

  if (!convertedAmount || !settings) {
    return <span className={className}>{primaryPrice}</span>;
  }

  const secondaryPrice = formatCurrencyLocalized(convertedAmount, settings.currency, settings.locale);

  return (
    <span className={className}>
      {primaryPrice}
      <span className="text-xs text-muted-foreground ml-2">
        ≈ {secondaryPrice}
      </span>
    </span>
  );
}
