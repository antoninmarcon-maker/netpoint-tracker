// @ts-nocheck — react-leaflet types mismatch with current version
import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { supabase } from '@/integrations/supabase/client';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';

import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

import SpotFilters, { EXTERIOR_TYPES, DEFAULT_FILTERS, type SpotFiltersState } from '@/components/spots/SpotFilters';

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

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function UserLocationMarker({ onPosition }: { onPosition?: (pos: [number, number]) => void }) {
  const { t } = useTranslation();
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const map = useMap();
  useEffect(() => {
    map.locate().on("locationfound", (e) => {
      setPosition(e.latlng);
      map.flyTo(e.latlng, 10); // zoom 10 ≈ 50km radius
      onPosition?.([e.latlng.lat, e.latlng.lng]);
    });
  }, [map]);
  const userIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-xl animate-pulse"></div>`,
    iconSize: [16, 16], iconAnchor: [8, 8], popupAnchor: [0, -8],
  });
  return position === null ? null : (
    <Marker position={position} icon={userIcon}>
      <Popup>{t('spots.youAreHere')}</Popup>
    </Marker>
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

export function filterSpots(spots: any[], filters: SpotFiltersState, userPosition: [number, number] | null): any[] {
  return spots.filter(spot => {
    const type = spot.type || 'outdoor_hard';

    // Pending filter
    if (filters.showPending) {
      return spot.status === 'waiting_for_validation';
    }

    if (spot.status !== 'validated') return false;

    // Main category gates
    if (type === 'club' && !filters.showClubs) return false;
    if (type === 'indoor') return false;
    if (EXTERIOR_TYPES.includes(type) && !filters.showExterieur) return false;

    // Exterior sub-type gates
    if (EXTERIOR_TYPES.includes(type)) {
      if (type === 'beach' && !filters.subFilters.ext_beach) return false;
      if ((type === 'green_volley' || type === 'outdoor_grass') && !filters.subFilters.ext_herbe) return false;
      if (type === 'outdoor_hard' && !filters.subFilters.ext_dur) return false;

      if (filters.subFilters.acces_libre && !spot.equip_acces_libre) return false;

      if (type === 'beach') {
        if (filters.subFilters.beach_eclairage && !spot.equip_eclairage) return false;
        if (filters.subFilters.beach_pmr && !spot.equip_pmr) return false;
        if (filters.subFilters.beach_saison === 'annee' && spot.equip_saisonnier) return false;
        if (filters.subFilters.beach_saison === 'saisonnier' && !spot.equip_saisonnier) return false;
      }

      if (type === 'green_volley' || type === 'outdoor_grass') {
        if (filters.subFilters.green_saison === 'annee' && spot.equip_saisonnier) return false;
        if (filters.subFilters.green_saison === 'saisonnier' && !spot.equip_saisonnier) return false;
        if (filters.subFilters.green_sol === 'naturel' && spot.equip_sol !== 'Gazon naturel') return false;
        if (filters.subFilters.green_sol === 'synthetique' && spot.equip_sol !== 'Gazon synthétique') return false;
      }
    }

    // Radius filter
    if (filters.radiusKm && userPosition) {
      const dist = getDistance(userPosition[0], userPosition[1], spot.lat, spot.lng);
      if (dist > filters.radiusKm) return false;
    }

    return true;
  });
}

export default function SpotMap({
  selectedSpotId, onSelectSpot, isAddingMode, newSpotLocation, onNewSpotLocationChange,
  filters, onFiltersChange, isModerator, onUserPositionChange,
}: SpotMapProps) {
  const { t } = useTranslation();
  const [spots, setSpots] = useState<any[]>([]);
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

  const handleUserPosition = (pos: [number, number]) => {
    setUserPosition(pos);
    onUserPositionChange?.(pos);
  };

  const filteredSpots = filterSpots(spots, filters, userPosition);

  const getMarkerIcon = (spot: any) => {
    const type = spot.type || 'outdoor_hard';
    const isPending = spot.status === 'waiting_for_validation';
    const configs: Record<string, { bg: string; icon: string }> = {
      club: { bg: 'bg-blue-700', icon: '🏛️' },
      indoor: { bg: 'bg-blue-500', icon: '🏟️' },
      beach: { bg: 'bg-yellow-500', icon: '🏖️' },
      green_volley: { bg: 'bg-green-600', icon: '🌿' },
      outdoor_hard: { bg: 'bg-green-500', icon: '☀️' },
      outdoor_grass: { bg: 'bg-green-400', icon: '🌱' },
    };
    const { bg, icon } = configs[type] || { bg: 'bg-gray-500', icon: '📍' };
    const border = isPending ? 'border-yellow-400' : 'border-white';
    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div class="w-8 h-8 rounded-full ${bg} flex items-center justify-center text-sm border-2 ${border} shadow-md">${icon}</div>`,
      iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16],
    });
  };

  const getAddMarkerIcon = () => L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-lg border-[3px] border-white shadow-xl animate-bounce">📍</div>`,
    iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40],
  });

  const createClusterCustomIcon = (cluster: any) => {
    const count = cluster.getChildCount();
    let size = 'w-10 h-10 text-sm';
    if (count > 100) size = 'w-14 h-14 text-base';
    else if (count > 50) size = 'w-12 h-12 text-sm';
    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div class="${size} rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center font-bold border-2 border-primary-foreground/30 shadow-lg backdrop-blur-sm">${count}</div>`,
      iconSize: [40, 40], iconAnchor: [20, 20],
    });
  };

  return (
    <div className="w-full h-full relative">
      <MapContainer center={defaultCenter} zoom={6} className="w-full h-full z-0" zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <SpotFilters
          filters={filters}
          onChange={onFiltersChange}
          count={filteredSpots.length}
          userPosition={userPosition}
          isModerator={isModerator}
        />

        <UserLocationMarker onPosition={handleUserPosition} />
        <AddMarkerController isActive={isAddingMode} location={newSpotLocation} onChange={onNewSpotLocationChange} />

        {isAddingMode && newSpotLocation && (
          <Marker position={newSpotLocation} draggable={true} icon={getAddMarkerIcon()}
            eventHandlers={{
              dragend: (e) => {
                const pos = e.target.getLatLng();
                onNewSpotLocationChange?.([pos.lat, pos.lng]);
              },
            }}>
            <Popup>
              <div className="text-center font-medium">{t('spots.dragMarker')}</div>
            </Popup>
          </Marker>
        )}

        <MarkerClusterGroup chunkedLoading iconCreateFunction={createClusterCustomIcon} maxClusterRadius={60}>
          {filteredSpots.map((spot) => (
            <Marker key={spot.id} position={[spot.lat, spot.lng]} icon={getMarkerIcon(spot)}
              eventHandlers={{ click: () => onSelectSpot(spot.id) }}>
              <Popup><div className="text-center font-bold text-xs">{spot.name}</div></Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
