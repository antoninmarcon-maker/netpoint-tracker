// @ts-nocheck — react-leaflet types mismatch with current version
import { useEffect, useState, useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { supabase } from '@/integrations/supabase/client';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';

import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

import SpotFilters, { type SpotFiltersState } from '@/components/spots/SpotFilters';
import MapSearchControl from '@/components/MapSearchControl';
import { filterSpots } from '@/lib/filterSpots';
import { SPOT_TYPE_CONFIG } from '@/lib/spotTypes';
import type { Tables } from '@/integrations/supabase/types';

L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

function useIsDark() {
  const subscribe = useCallback((cb: () => void) => {
    const obs = new MutationObserver(cb);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return useSyncExternalStore(subscribe, () => document.documentElement.classList.contains('dark'));
}

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
  recenterTrigger?: number;
  refreshTrigger?: number;
}

const defaultCenter: [number, number] = [46.603354, 1.888334];

function buildMarkerSvg(icon: string, isPending: boolean): string {
  const borderColor = isPending ? '#facc15' : '#09090b';
  const borderWidth = isPending ? 3 : 2;
  return `
    <div style="
      width: 36px; height: 36px;
      border-radius: 50%;
      background: #fafafa;
      border: ${borderWidth}px solid ${borderColor};
      box-shadow: 0 2px 12px rgba(0,0,0,0.5);
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
    icon = L.divIcon({
      className: '',
      html: buildMarkerSvg(emoji, isPending),
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -20],
    });
    markerIconCache.set(key, icon);
  }
  return icon;
}

const userLocationIcon = L.divIcon({
  className: '',
  html: `<div style="
    width: 14px; height: 14px;
    border-radius: 50%;
    background: #eab308;
    border: 3px solid #09090b;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
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

function RecenterController({ trigger }: { trigger: number }) {
  const map = useMap();
  useEffect(() => {
    if (trigger === 0) return;
    map.once("locationfound", (e) => {
      map.flyTo(e.latlng, 13, { duration: 1 });
    });
    map.locate();
  }, [trigger, map]);
  return null;
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

interface MapBounds { south: number; north: number; west: number; east: number; zoom: number }

function BoundsWatcher({ onChange }: { onChange: (b: MapBounds) => void }) {
  const map = useMap();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emit = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const b = map.getBounds();
      onChange({
        south: b.getSouth(), north: b.getNorth(),
        west: b.getWest(), east: b.getEast(),
        zoom: map.getZoom(),
      });
    }, 500);
  }, [map, onChange]);

  useEffect(() => {
    emit(); // initial bounds
    map.on('moveend', emit);
    return () => { map.off('moveend', emit); if (timer.current) clearTimeout(timer.current); };
  }, [map, emit]);

  return null;
}

export default function SpotMap({
  selectedSpotId, onSelectSpot, isAddingMode, newSpotLocation, onNewSpotLocationChange,
  filters, onFiltersChange, isModerator, onUserPositionChange, recenterTrigger = 0,
  refreshTrigger = 0,
}: SpotMapProps) {
  const { t } = useTranslation();
  const isDark = useIsDark();
  const [spots, setSpots] = useState<Tables<'spots_with_coords'>[]>([]);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const boundsRef = useRef<MapBounds | null>(null);
  const [boundsVersion, setBoundsVersion] = useState(0);
  const ZOOM_THRESHOLD = 8;
  const prevZoomBand = useRef<'global' | 'local'>('global');

  const handleBoundsChange = useCallback((b: MapBounds) => {
    const prev = boundsRef.current;
    boundsRef.current = b;
    const band = b.zoom >= ZOOM_THRESHOLD ? 'local' : 'global';
    const prevBand = prevZoomBand.current;
    prevZoomBand.current = band;

    // Only re-query when: crossing the zoom threshold, or panning while zoomed in
    if (band !== prevBand || band === 'local' || !prev) {
      setBoundsVersion(v => v + 1);
    }
  }, []);

  useEffect(() => {
    const bounds = boundsRef.current;
    if (!bounds) return;
    let cancelled = false;

    const load = async () => {
      const cols = 'id, name, type, source, lat, lng, status, equip_sol, equip_eclairage, equip_acces_libre, equip_pmr, equip_saisonnier';

      if (filters.showPending) {
        const [pendingRes, reportedIdsRes] = await Promise.all([
          supabase.from('spots_with_coords').select(cols).eq('status', 'waiting_for_validation'),
          supabase.from('spot_comments').select('spot_id').not('report_reason', 'is', null),
        ]);
        if (cancelled) return;

        let allSpots = pendingRes.data || [];
        const reportedIds = [...new Set((reportedIdsRes.data || []).map((r: any) => r.spot_id))];
        const pendingIds = new Set(allSpots.map(s => s.id));
        const missingIds = reportedIds.filter(id => !pendingIds.has(id));

        if (missingIds.length > 0) {
          const { data: reportedSpots } = await supabase.from('spots_with_coords').select(cols).in('id', missingIds);
          if (cancelled) return;
          if (reportedSpots) allSpots = [...allSpots, ...reportedSpots];
        }
        setSpots(allSpots);
      } else {
        let query = supabase.from('spots_with_coords').select(cols).eq('status', 'validated');

        if (bounds.zoom >= ZOOM_THRESHOLD) {
          query = query
            .gte('lat', bounds.south)
            .lte('lat', bounds.north)
            .gte('lng', bounds.west)
            .lte('lng', bounds.east);
        }

        const { data, error } = await query;
        if (cancelled) return;
        if (error) console.error('[SpotMap] loadSpots error:', error);
        if (!error && data) setSpots(data);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [filters.showPending, boundsVersion, refreshTrigger]);

  const handleUserPosition = useCallback((pos: [number, number]) => {
    setUserPosition(pos);
    onUserPositionChange?.(pos);
  }, [onUserPositionChange]);

  const filteredSpots = useMemo(() => filterSpots(spots, filters, userPosition), [spots, filters, userPosition]);

  const createClusterCustomIcon = useCallback((cluster: any) => {
    const count = cluster.getChildCount();
    const fontSize = count > 100 ? 14 : 12;
    const bg = isDark ? '#fafafa' : '#09090b';
    const fg = isDark ? '#09090b' : '#fafafa';
    const border = isDark ? '#09090b' : '#d4d4d8';

    return L.divIcon({
      className: '',
      html: `<div style="
        width: 42px; height: 42px;
        border-radius: 50%;
        background: ${bg};
        color: ${fg};
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; font-size: ${fontSize}px;
        font-family: 'DM Sans', sans-serif;
        border: 2px solid ${border};
        box-shadow: 0 2px 12px rgba(0,0,0,0.25);
      ">${count}</div>`,
      iconSize: [42, 42],
      iconAnchor: [21, 21],
    });
  }, [isDark]);

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={defaultCenter}
        zoom={6}
        className="w-full h-full z-0"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          key={isDark ? 'dark' : 'light'}
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={isDark ? TILE_DARK : TILE_LIGHT}
        />

        {/* Search bar — sits in the top bar area alongside back button */}
        <MapSearchControl isAddingMode={isAddingMode} onLocationSelected={onNewSpotLocationChange} onSpotSelected={onSelectSpot} />

        {/* Filters — compact row below search */}
        <SpotFilters
          filters={filters}
          onChange={onFiltersChange}
          count={filteredSpots.length}
          isModerator={isModerator}
        />

        <BoundsWatcher onChange={handleBoundsChange} />
        <UserLocationMarker onPosition={handleUserPosition} />
        <RecenterController trigger={recenterTrigger} />
        <AddMarkerController isActive={isAddingMode} location={newSpotLocation} onChange={onNewSpotLocationChange} />

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
