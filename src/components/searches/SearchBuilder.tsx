import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

interface SearchCriteria {
  region: string;
  min_yield: number;
  max_price: number | null;
  min_bedrooms: number;
  property_type: string[];
}

interface SearchBuilderProps {
  onSave?: () => void;
}

export function SearchBuilder({ onSave }: SearchBuilderProps) {
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [criteria, setCriteria] = useState<SearchCriteria>({
    region: 'UK',
    min_yield: 6,
    max_price: null,
    min_bedrooms: 1,
    property_type: []
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a search name');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to save searches');
        return;
      }

      // Create saved search
      const { error: searchError } = await supabase
        .from('saved_searches')
        .insert({
          user_id: user.id,
          name: name,
          filters_json: criteria,
          is_active: true
        });

      if (searchError) throw searchError;

      // Create corresponding alert
      const { error: alertError } = await supabase
        .from('alerts')
        .insert({
          name: name,
          alert_type: 'saved_search',
          min_yield: criteria.min_yield,
          max_price: criteria.max_price,
          property_type: criteria.property_type.length > 0 ? criteria.property_type[0] as any : null,
          location_filter: criteria.region,
          is_active: true
        } as any);

      if (alertError) throw alertError;

      toast.success('Search saved! You\'ll receive alerts when new matches appear.');
      
      // Reset form
      setName('');
      setCriteria({
        region: 'UK',
        min_yield: 6,
        max_price: null,
        min_bedrooms: 1,
        property_type: []
      });

      onSave?.();
    } catch (error: any) {
      console.error('Failed to save search:', error);
      toast.error('Failed to save search');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Saved Search</CardTitle>
        <CardDescription>
          Set your criteria and get notified when matching deals appear
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Search Name</Label>
          <Input
            placeholder="e.g., High Yield Manchester Properties"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Region</Label>
            <Select
              value={criteria.region}
              onValueChange={(val) => setCriteria({ ...criteria, region: val })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UK">🇬🇧 United Kingdom</SelectItem>
                <SelectItem value="US">🇺🇸 United States</SelectItem>
                <SelectItem value="DE">🇩🇪 Germany</SelectItem>
                <SelectItem value="ES">🇪🇸 Spain</SelectItem>
                <SelectItem value="FR">🇫🇷 France</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Alert Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instant">Instant</SelectItem>
                <SelectItem value="daily">Daily Digest</SelectItem>
                <SelectItem value="weekly">Weekly Summary</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Minimum Yield: {criteria.min_yield}%</Label>
          <Slider
            min={4}
            max={15}
            step={0.5}
            value={[criteria.min_yield]}
            onValueChange={([val]) => setCriteria({ ...criteria, min_yield: val })}
          />
        </div>

        <div className="space-y-2">
          <Label>Maximum Price (£)</Label>
          <Input
            type="number"
            placeholder="No limit"
            value={criteria.max_price || ''}
            onChange={(e) => setCriteria({ 
              ...criteria, 
              max_price: e.target.value ? parseFloat(e.target.value) : null 
            })}
          />
        </div>

        <div className="space-y-2">
          <Label>Minimum Bedrooms</Label>
          <Select
            value={criteria.min_bedrooms.toString()}
            onValueChange={(val) => setCriteria({ ...criteria, min_bedrooms: parseInt(val) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((num) => (
                <SelectItem key={num} value={num.toString()}>
                  {num}+ bedroom{num > 1 ? 's' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Search & Enable Alerts'}
        </Button>
      </CardContent>
    </Card>
  );
}
