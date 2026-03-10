// @ts-nocheck — react-leaflet types mismatch with current version
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix typical missing marker icons issue in leaflet due to bundlers
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

// Default center: France
const defaultCenter: [number, number] = [46.603354, 1.888334];

function UserLocationMarker() {
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
      <Popup>Vous êtes ici</Popup>
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
  
  const [spots, setSpots] = useState<any[]>([]);

  useEffect(() => {
    // Only fetch validated spots
    supabase.from('spots_with_coords')
      .select('id, name, type, lat, lng')
      .eq('status', 'validated')
      .then(({ data, error }) => {
        if (!error && data) {
          setSpots(data);
        }
      });
  }, []);

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
              <div className="text-center font-medium">Déplacez-moi !</div>
              <div className="text-xs text-muted-foreground mt-1">Placez ce marqueur sur le terrain</div>
            </Popup>
          </Marker>
        )}

        {spots.map((spot) => (
          <Marker 
            key={spot.id} 
            position={[spot.lat, spot.lng]}
            eventHandlers={{
              click: () => onSelectSpot(spot.id)
            }}
          >
            <Popup>
              <div className="text-center font-bold">{spot.name}</div>
            </Popup>
          </Marker>
        ))}
        
      </MapContainer>
    </div>
  );
}
