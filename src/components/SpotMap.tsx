// @ts-nocheck — react-leaflet types mismatch with current version
import { useEffect, useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { supabase } from '@/integrations/supabase/client';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';
import { Locate } from 'lucide-react';

import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

import SpotFilters, { type SpotFiltersState } from '@/components/spots/SpotFilters';
import MapSearchControl from '@/components/MapSearchControl';
import { filterSpots } from '@/lib/filterSpots';
import { SPOT_TYPE_CONFIG } from '@/lib/spotTypes';
import type { Tables } from '@/integrations/supabase/types';

L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

interface SpotMapProps {
  selectedSpotId: string | null;
  onSelectSpot: (id: string) => void;
  isAddingMode?: boolean;
  newSpotLocation?: [number, number];
  onNewSpotLocationChange?: (latlng: [number, number]) => void;
  filters: SpotFiltersState;
  onFiltersChange: (f: SpotFiltersState) => void;
  isModerator?: boolean;
  onUserPositionChange?: (pos: [number, number]) => void;
}

const defaultCenter: [number, number] = [46.603354, 1.888334];

// Marker icon builder + cache to avoid recreating icons per render
function buildMarkerSvg(color: string, icon: string, isPending: boolean): string {
  const borderColor = isPending ? '#facc15' : 'white';
  const borderWidth = isPending ? 3 : 2;
  return `
    <div style="
      width: 36px; height: 36px;
      border-radius: 50%;
      background: ${color};
      border: ${borderWidth}px solid ${borderColor};
      box-shadow: 0 2px 8px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.08);
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; line-height: 1;
      transition: transform 0.15s ease;
    ">${icon}</div>
  `;
}

const markerIconCache = new Map<string, L.DivIcon>();
function getCachedMarkerIcon(type: string, isPending: boolean): L.DivIcon {
  const key = `${type}:${isPending}`;
  let icon = markerIconCache.get(key);
  if (!icon) {
    const config = SPOT_TYPE_CONFIG[type];
    const emoji = config?.emoji || '📍';
    const color = config?.hex || '#6b7280';
    icon = L.divIcon({
      className: '',
      html: buildMarkerSvg(color, emoji, isPending),
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -20],
    });
    markerIconCache.set(key, icon);
  }
  return icon;
}

// Static icons (never change, created once)
const userLocationIcon = L.divIcon({
  className: '',
  html: `<div style="
    width: 14px; height: 14px;
    border-radius: 50%;
    background: #3b82f6;
    border: 3px solid white;
    box-shadow: 0 0 0 2px rgba(59,130,246,0.3), 0 2px 8px rgba(0,0,0,0.2);
  "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -10],
});

const addMarkerIcon = L.divIcon({
  className: '',
  html: `<div style="
    width: 44px; height: 44px;
    border-radius: 50%;
    background: hsl(215, 100%, 50%);
    border: 3px solid white;
    box-shadow: 0 4px 16px rgba(0,100,255,0.35), 0 0 0 2px rgba(0,100,255,0.15);
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; line-height: 1;
    animation: bounce 0.6s ease infinite alternate;
  ">📍</div>`,
  iconSize: [44, 44],
  iconAnchor: [22, 44],
  popupAnchor: [0, -44],
});

function UserLocationMarker({ onPosition }: { onPosition?: (pos: [number, number]) => void }) {
  const { t } = useTranslation();
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const map = useMap();

  useEffect(() => {
    const handler = (e: L.LocationEvent) => {
      setPosition(e.latlng);
      map.flyTo(e.latlng, 10);
      onPosition?.([e.latlng.lat, e.latlng.lng]);
    };
    map.on("locationfound", handler);
    map.locate();
    return () => { map.off("locationfound", handler); };
  }, [map]);

  return position === null ? null : (
    <Marker position={position} icon={userLocationIcon}>
      <Popup className="spot-popup">{t('spots.youAreHere')}</Popup>
    </Marker>
  );
}

function RecenterButton() {
  const map = useMap();
  const handleRecenter = () => {
    map.once("locationfound", (e) => {
      map.flyTo(e.latlng, 13, { duration: 1 });
    });
    map.locate();
  };

  return (
    <button
      onClick={handleRecenter}
      className="absolute bottom-28 right-3 z-[400] w-11 h-11 rounded-full bg-background/95 backdrop-blur-md border border-border shadow-lg flex items-center justify-center text-foreground hover:bg-background transition-colors active:scale-95"
      title="Ma position"
    >
      <Locate size={18} />
    </button>
  );
}

function AddMarkerController({ isActive, location, onChange }: {
  isActive?: boolean; location?: [number, number]; onChange?: (loc: [number, number]) => void;
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
  selectedSpotId, onSelectSpot, isAddingMode, newSpotLocation, onNewSpotLocationChange,
  filters, onFiltersChange, isModerator, onUserPositionChange,
}: SpotMapProps) {
  const { t } = useTranslation();
  const [spots, setSpots] = useState<Tables<'spots_with_coords'>[]>([]);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);

  const loadSpots = useCallback(() => {
    const query = supabase
      .from('spots_with_coords')
      .select('id, name, type, source, lat, lng, status, equip_sol, equip_eclairage, equip_acces_libre, equip_pmr, equip_saisonnier');

    if (!filters.showPending) {
      query.eq('status', 'validated');
    }

    query.then(({ data, error }) => {
      if (!error && data) setSpots(data);
    });
  }, [filters.showPending]);

  useEffect(() => { loadSpots(); }, [loadSpots]);

  const handleUserPosition = useCallback((pos: [number, number]) => {
    setUserPosition(pos);
    onUserPositionChange?.(pos);
  }, [onUserPositionChange]);

  const filteredSpots = useMemo(() => filterSpots(spots, filters, userPosition), [spots, filters, userPosition]);

  const createClusterCustomIcon = (cluster: any) => {
    const count = cluster.getChildCount();
    const size = count > 100 ? 52 : count > 50 ? 46 : 40;
    const fontSize = count > 100 ? 14 : 12;

    return L.divIcon({
      className: '',
      html: `<div style="
        width: ${size}px; height: ${size}px;
        border-radius: 50%;
        background: hsl(215, 100%, 50%);
        color: white;
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; font-size: ${fontSize}px;
        font-family: 'DM Sans', sans-serif;
        border: 2.5px solid rgba(255,255,255,0.6);
        box-shadow: 0 2px 12px rgba(0,100,255,0.3), 0 0 0 4px rgba(0,100,255,0.1);
      ">${count}</div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={defaultCenter}
        zoom={6}
        className="w-full h-full z-0"
        zoomControl={false}
        attributionControl={false}
      >
        {/* CartoDB Voyager — clean, modern tiles */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Search bar */}
        <MapSearchControl isAddingMode={isAddingMode} onLocationSelected={onNewSpotLocationChange} />

        {/* Filters */}
        <SpotFilters
          filters={filters}
          onChange={onFiltersChange}
          count={filteredSpots.length}
          userPosition={userPosition}
          isModerator={isModerator}
        />

        <UserLocationMarker onPosition={handleUserPosition} />
        <AddMarkerController isActive={isAddingMode} location={newSpotLocation} onChange={onNewSpotLocationChange} />

        {/* Recenter button */}
        <RecenterButton />

        {isAddingMode && newSpotLocation && (
          <Marker
            position={newSpotLocation}
            draggable={true}
            icon={addMarkerIcon}
            eventHandlers={{
              dragend: (e) => {
                const pos = e.target.getLatLng();
                onNewSpotLocationChange?.([pos.lat, pos.lng]);
              },
            }}
          >
            <Popup className="spot-popup">
              <div className="text-center font-medium text-sm">{t('spots.dragMarker')}</div>
            </Popup>
          </Marker>
        )}

        <MarkerClusterGroup chunkedLoading iconCreateFunction={createClusterCustomIcon} maxClusterRadius={60}>
          {filteredSpots.filter(spot => spot.lat != null && spot.lng != null).map((spot) => (
            <Marker
              key={spot.id}
              position={[spot.lat!, spot.lng!]}
              icon={getCachedMarkerIcon(spot.type || 'outdoor_hard', spot.status === 'waiting_for_validation')}
              eventHandlers={{ click: () => onSelectSpot(spot.id) }}
            >
              <Popup className="spot-popup">
                <div className="text-center font-bold text-xs">{spot.name}</div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
