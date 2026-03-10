// @ts-nocheck — react-leaflet types mismatch with current version
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { supabase } from '@/integrations/supabase/client';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';

import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

interface SpotMapProps {
  selectedSpotId: string | null;
  onSelectSpot: (id: string) => void;
  isAddingMode?: boolean;
  newSpotLocation?: [number, number];
  onNewSpotLocationChange?: (latlng: [number, number]) => void;
}

const defaultCenter: [number, number] = [46.603354, 1.888334];

function UserLocationMarker() {
  const { t } = useTranslation();
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const map = useMap();

  useEffect(() => {
    map.locate().on("locationfound", function (e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    });
  }, [map]);

  return position === null ? null : (
    <Marker position={position}>
      <Popup>{t('spots.youAreHere')}</Popup>
    </Marker>
  );
}

function AddMarkerController({ 
  isActive, 
  location, 
  onChange 
}: { 
  isActive?: boolean; 
  location?: [number, number]; 
  onChange?: (loc: [number, number]) => void 
}) {
  const map = useMap();
  useEffect(() => {
    if (isActive && !location && onChange) {
      const center = map.getCenter();
      onChange([center.lat, center.lng]);
    }
  }, [isActive, location, map, onChange]);
  return null;
}

export default function SpotMap({ 
  selectedSpotId, 
  onSelectSpot,
  isAddingMode,
  newSpotLocation,
  onNewSpotLocationChange
}: SpotMapProps) {
  const { t } = useTranslation();
  const [spots, setSpots] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('spots_with_coords')
      .select('id, name, type, lat, lng, is_verified, is_temporary, status')
      .in('status', ['validated', 'waiting_for_validation'])
      .then(({ data, error }) => {
        if (!error && data) {
          setSpots(data);
        }
      });
  }, []);

  const [activeFilters, setActiveFilters] = useState<string[]>(['indoor', 'outdoor_hard', 'outdoor_grass', 'beach', 'temporary', 'unverified']);

  const toggleFilter = (filterName: string) => {
    setActiveFilters(prev => 
      prev.includes(filterName) ? prev.filter(f => f !== filterName) : [...prev, filterName]
    );
  };

  const filteredSpots = spots.filter(spot => {
    // If it's a specific type but that type is not active, hide it
    if (spot.type && !activeFilters.includes(spot.type)) return false;
    
    // If it's temporary but temporary filter is off, hide it
    if (spot.is_temporary && !activeFilters.includes('temporary')) return false;
    
    // If it's unverified (from Google) but unverified is off, hide it
    if (!spot.is_verified && spot.status === 'waiting_for_validation' && !activeFilters.includes('unverified')) return false;

    return true;
  });

  const getMarkerIcon = (spot: any) => {
    let bgColor = 'bg-blue-500';
    let icon = '🏟️';
    
    if (spot.type === 'beach') { bgColor = 'bg-yellow-500'; icon = '🏖️'; }
    if (spot.type === 'outdoor_hard' || spot.type === 'outdoor_grass') { bgColor = 'bg-green-500'; icon = '☀️'; }
    
    const opacity = (!spot.is_verified && spot.status === 'waiting_for_validation') ? 'opacity-60 border-dashed border-2' : 'border-2 border-white shadow-md';
    
    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div class="w-8 h-8 rounded-full ${bgColor} flex items-center justify-center text-sm ${opacity}">${icon}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });
  };

  return (
    <div className="w-full h-full relative">
      <MapContainer 
        center={defaultCenter} 
        zoom={6} 
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Filter Pills overlay */}
        <div className="absolute top-4 left-4 right-14 z-[400] overflow-x-auto pb-2 hide-scrollbar">
          <div className="flex items-center gap-2">
            {[
              { id: 'indoor', label: '🏟️ En salle' },
              { id: 'beach', label: '🏖️ Beach' },
              { id: 'outdoor_hard', label: '☀️ Extérieur (Dur)' },
              { id: 'outdoor_grass', label: '🌱 Extérieur (Herbe)' },
              { id: 'temporary', label: '⏳ Éphémère' },
              { id: 'unverified', label: '❓ À vérifier' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => toggleFilter(f.id)}
                className={`flex-none px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide border transition-all shadow-sm ${
                  activeFilters.includes(f.id) 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-background/90 text-foreground border-border backdrop-blur-sm opacity-70 hover:opacity-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <UserLocationMarker />
        <AddMarkerController isActive={isAddingMode} location={newSpotLocation} onChange={onNewSpotLocationChange} />

        {isAddingMode && newSpotLocation && (
          <Marker 
            position={newSpotLocation} 
            draggable={true}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target;
                const position = marker.getLatLng();
                if (onNewSpotLocationChange) {
                  onNewSpotLocationChange([position.lat, position.lng]);
                }
              },
            }}
          >
            <Popup>
              <div className="text-center font-medium">{t('spots.dragMarker')}</div>
              <div className="text-xs text-muted-foreground mt-1">{t('spots.dragMarkerHint')}</div>
            </Popup>
          </Marker>
        )}

        {filteredSpots.map((spot) => (
          <Marker 
            key={spot.id} 
            position={[spot.lat, spot.lng]}
            icon={getMarkerIcon(spot)}
            eventHandlers={{
              click: () => onSelectSpot(spot.id)
            }}
          >
            <Popup>
              <div className="text-center font-bold">{spot.name}</div>
              {(!spot.is_verified && spot.status === 'waiting_for_validation') && (
                <div className="text-xs text-orange-500 font-semibold mt-1">À vérifier par la communauté</div>
              )}
            </Popup>
          </Marker>
        ))}
        
      </MapContainer>
    </div>
  );
}
