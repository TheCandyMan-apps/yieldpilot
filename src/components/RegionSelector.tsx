import { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';

interface Region {
  region: string;
  currency: string;
  locale: string;
}

const REGION_FLAGS: Record<string, string> = {
  UK: '🇬🇧',
  US: '🇺🇸',
  DE: '🇩🇪',
  FR: '🇫🇷',
  ES: '🇪🇸',
};

const REGION_NAMES: Record<string, string> = {
  UK: 'United Kingdom',
  US: 'United States',
  DE: 'Germany',
  FR: 'France',
  ES: 'Spain',
};

export function RegionSelector() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>(() => {
    return localStorage.getItem('preferred-region') || 'UK';
  });

  useEffect(() => {
    fetchRegions();
  }, []);

  const fetchRegions = async () => {
    try {
      const { data, error } = await supabase
        .from('regional_parameters')
        .select('region, currency, locale');

      if (error) throw error;
      setRegions(data || []);
    } catch (error) {
      console.error('Error fetching regions:', error);
    }
  };

  const handleRegionChange = (region: string) => {
    setSelectedRegion(region);
    localStorage.setItem('preferred-region', region);
    // Reload to apply region-specific settings
    window.location.reload();
  };

  if (!regions.length) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="text-xl">{REGION_FLAGS[selectedRegion]}</span>
          <span className="hidden sm:inline">{selectedRegion}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {regions.map((r) => (
          <DropdownMenuItem
            key={r.region}
            onClick={() => handleRegionChange(r.region)}
            className={selectedRegion === r.region ? 'bg-accent' : ''}
          >
            <span className="mr-2 text-lg">{REGION_FLAGS[r.region]}</span>
            <span>{REGION_NAMES[r.region]}</span>
            <span className="ml-auto text-xs text-muted-foreground">{r.currency}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
