import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

type MapDeal = Database['public']['Views']['v_investor_deals']['Row'];

const MapSearch = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState<MapDeal[]>([]);
  const navigate = useNavigate();

  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_API_KEY;

  const fetchDealsInBounds = async (bounds: mapboxgl.LngLatBounds) => {
    try {
      // Query v_investor_deals view for properties in bounds
      const { data: deals, error } = await supabase
        .from('v_investor_deals')
        .select('*')
        .gte('latitude', bounds.getSouth())
        .lte('latitude', bounds.getNorth())
        .gte('longitude', bounds.getWest())
        .lte('longitude', bounds.getEast())
        .limit(100);

      if (error) throw error;
      
      setDeals(deals || []);
      updateMarkers(deals || []);
    } catch (error) {
      console.error('Error fetching deals:', error);
      toast.error('Failed to load properties');
    }
  };

  const updateMarkers = (dealsData: MapDeal[]) => {
    // Remove existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    dealsData.forEach(deal => {
      if (!deal.latitude || !deal.longitude || !map.current) return;

      const yieldValue = deal.gross_yield_pct?.toFixed(1) || 'N/A';
      
      // Create marker element
      const el = document.createElement('div');
      el.className = 'marker-pin';
      el.innerHTML = `
        <div class="flex flex-col items-center cursor-pointer">
          <div class="bg-primary text-primary-foreground px-2 py-1 rounded-md text-sm font-semibold shadow-lg border border-border">
            ${yieldValue}%
          </div>
          <svg width="24" height="24" viewBox="0 0 24 24" class="text-primary -mt-1">
            <path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          </svg>
        </div>
      `;

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([deal.longitude, deal.latitude])
        .addTo(map.current);

      // Create popup
      const popup = new mapboxgl.Popup({ offset: 25, closeButton: true })
        .setHTML(`
          <div class="p-2 min-w-[250px]">
            <h3 class="font-semibold text-sm mb-2">${deal.address_line1 || 'Property'}</h3>
            <p class="text-xs text-muted-foreground mb-1">${deal.city || ''}, ${deal.postcode || ''}</p>
            <div class="space-y-1 mb-3">
              <p class="text-sm"><strong>Price:</strong> ${deal.currency} ${deal.price.toLocaleString()}</p>
              <p class="text-sm"><strong>Gross Yield:</strong> ${yieldValue}%</p>
            </div>
            <button 
              class="w-full bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
              onclick="window.location.href='/deal/${deal.id}'"
            >
              View Deal
            </button>
          </div>
        `);

      marker.setPopup(popup);
      markersRef.current.push(marker);
    });
  };

  useEffect(() => {
    if (!MAPBOX_TOKEN) {
      toast.error('Mapbox API key not configured');
      setLoading(false);
      return;
    }

    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-0.1276, 51.5074], // London
      zoom: 10,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    map.current.on('load', () => {
      setLoading(false);
      if (map.current) {
        fetchDealsInBounds(map.current.getBounds());
      }
    });

    map.current.on('moveend', () => {
      if (map.current) {
        fetchDealsInBounds(map.current.getBounds());
      }
    });

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      map.current?.remove();
    };
  }, [MAPBOX_TOKEN]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Mapbox API Key Required</h2>
            <p className="text-muted-foreground mb-4">
              Please add your Mapbox API key to the .env file as VITE_MAPBOX_API_KEY
            </p>
            <Button onClick={() => navigate(-1)}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full">
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}
      
      <div className="absolute top-4 left-4 z-10">
        <Card className="shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">Properties Found</p>
                <p className="text-2xl font-bold text-primary">{deals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};

export default MapSearch;
