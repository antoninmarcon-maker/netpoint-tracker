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

L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

interface SpotMapProps {
  selectedSpotId: string | null;
  onSelectSpot: (id: string) => void;
  isAddingMode?: boolean;
  newSpotLocation?: [number, number];
  onNewSpotLocationChange?: (latlng: [number, number]) => void;
}

const defaultCenter: [number, number] = [46.603354, 1.888334];

// Group mapping: which DB types belong to which UI category
const EXTERIOR_TYPES = ['beach', 'green_volley', 'outdoor_hard', 'outdoor_grass'];

interface SubFilters {
  acces_libre: boolean;
  // Exterior sub-type toggles
  ext_beach: boolean;
  ext_herbe: boolean;
  ext_dur: boolean;
  // Beach-specific
  beach_eclairage: boolean;
  beach_pmr: boolean;
  beach_saison: 'all' | 'annee' | 'saisonnier';
  // Herbe-specific
  green_sol: 'all' | 'naturel' | 'synthetique';
  green_saison: 'all' | 'annee' | 'saisonnier';
}

const DEFAULT_SUB_FILTERS: SubFilters = {
  acces_libre: true,
  ext_beach: true,
  ext_herbe: true,
  ext_dur: true,
  beach_eclairage: false,
  beach_pmr: false,
  beach_saison: 'all',
  green_sol: 'all',
  green_saison: 'all',
};

function UserLocationMarker() {
  const { t } = useTranslation();
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const map = useMap();
  useEffect(() => {
    map.locate().on("locationfound", (e) => {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
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

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-none px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide border transition-all shadow-sm whitespace-nowrap ${
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background/90 text-foreground border-border backdrop-blur-sm opacity-70 hover:opacity-100'
      }`}
    >
      {children}
    </button>
  );
}

export default function SpotMap({
  selectedSpotId,
  onSelectSpot,
  isAddingMode,
  newSpotLocation,
  onNewSpotLocationChange,
}: SpotMapProps) {
  const { t } = useTranslation();
  const [spots, setSpots] = useState<any[]>([]);
  // 3 main categories
  const [showExterieur, setShowExterieur] = useState(true);
  const [showGymnase, setShowGymnase] = useState(true);
  const [showClubs, setShowClubs] = useState(true);
  const [subFilters, setSubFilters] = useState<SubFilters>(DEFAULT_SUB_FILTERS);
  const [showSubFilters, setShowSubFilters] = useState(false);

  useEffect(() => {
    supabase
      .from('spots_with_coords')
      .select('id, name, type, source, lat, lng, status, equip_sol, equip_eclairage, equip_acces_libre, equip_pmr, equip_saisonnier')
      .eq('status', 'validated')
      .then(({ data, error }) => {
        if (!error && data) setSpots(data);
      });
  }, []);

  const toggleType = (type: string) => {
    setActiveTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const setSubFilter = <K extends keyof SubFilters>(key: K, value: SubFilters[K]) => {
    setSubFilters(prev => ({ ...prev, [key]: value }));
  };

  const filteredSpots = spots.filter(spot => {
    const type = spot.type || 'outdoor_hard';
    if (!activeTypes.includes(type)) return false;

    // Global free access filter (applies to beach & green)
    if (subFilters.acces_libre && (type === 'beach' || type === 'green_volley')) {
      if (!spot.equip_acces_libre) return false;
    }

    // Beach sub-filters
    if (type === 'beach') {
      if (subFilters.beach_eclairage && !spot.equip_eclairage) return false;
      if (subFilters.beach_pmr && !spot.equip_pmr) return false;
      if (subFilters.beach_saison === 'annee' && spot.equip_saisonnier) return false;
      if (subFilters.beach_saison === 'saisonnier' && !spot.equip_saisonnier) return false;
    }

    // Green-volley sub-filters
    if (type === 'green_volley') {
      if (subFilters.green_saison === 'annee' && spot.equip_saisonnier) return false;
      if (subFilters.green_saison === 'saisonnier' && !spot.equip_saisonnier) return false;
      if (subFilters.green_sol === 'naturel' && spot.equip_sol !== 'Gazon naturel') return false;
      if (subFilters.green_sol === 'synthetique' && spot.equip_sol !== 'Gazon synthétique') return false;
    }

    return true;
  });

  const getMarkerIcon = (spot: any) => {
    const type = spot.type || 'outdoor_hard';
    const configs: Record<string, { bg: string; icon: string }> = {
      club:          { bg: 'bg-blue-700',   icon: '🏛️' },
      indoor:        { bg: 'bg-blue-500',   icon: '🏟️' },
      beach:         { bg: 'bg-yellow-500', icon: '🏖️' },
      green_volley:  { bg: 'bg-green-600',  icon: '🌿' },
      outdoor_hard:  { bg: 'bg-green-500',  icon: '☀️' },
      outdoor_grass: { bg: 'bg-green-400',  icon: '🌱' },
    };
    const { bg, icon } = configs[type] || { bg: 'bg-gray-500', icon: '📍' };
    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div class="w-8 h-8 rounded-full ${bg} flex items-center justify-center text-sm border-2 border-white shadow-md">${icon}</div>`,
      iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16],
    });
  };

  const getAddMarkerIcon = () => L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-lg border-[3px] border-white shadow-xl animate-bounce">📍</div>`,
    iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40],
  });

  const mainFilters = [
    { id: 'beach',         label: '🏖️ Beach', hasSub: true },
    { id: 'green_volley',  label: '🌿 Green', hasSub: true },
    { id: 'outdoor_hard',  label: '☀️ Extérieur' },
    { id: 'outdoor_grass', label: '🌱 Herbe' },
    { id: 'indoor',        label: '🏟️ En salle' },
    { id: 'club',          label: '🏛️ Clubs' },
  ];

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

        {/* Global + type filter pills */}
        <div className="absolute top-4 left-4 right-4 z-[400] flex flex-col gap-2">
          {/* Free access toggle */}
          <div className="flex items-center gap-2">
            <FilterPill active={subFilters.acces_libre} onClick={() => setSubFilter('acces_libre', !subFilters.acces_libre)}>
              🔓 Libre accès uniquement
            </FilterPill>
            <span className="text-[10px] text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full border border-border">
              {filteredSpots.length} terrains
            </span>
          </div>

          {/* Type pills */}
          <div className="overflow-x-auto pb-1 hide-scrollbar">
            <div className="flex items-center gap-2">
              {mainFilters.map(f => (
                <div key={f.id} className="flex items-center gap-0.5">
                  <FilterPill active={activeTypes.includes(f.id)} onClick={() => toggleType(f.id)}>
                    {f.label}
                  </FilterPill>
                  {f.hasSub && activeTypes.includes(f.id) && (
                    <button
                      onClick={() => setShowSubFilters(prev => prev === f.id ? null : f.id as any)}
                      className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center border transition-all ${
                        showSubFilters === f.id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background/90 border-border text-muted-foreground'
                      }`}
                    >
                      ⚙
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Beach sub-filters */}
        {showSubFilters === 'beach' && (
          <div className="absolute top-24 left-4 z-[400] bg-background/95 backdrop-blur-sm border border-border rounded-xl p-3 shadow-lg min-w-[220px]">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Beach-Volley</p>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={subFilters.beach_eclairage} onChange={e => setSubFilter('beach_eclairage', e.target.checked)} className="rounded" />
                Éclairage
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={subFilters.beach_pmr} onChange={e => setSubFilter('beach_pmr', e.target.checked)} className="rounded" />
                Accès PMR
              </label>
              <div className="border-t border-border pt-2 mt-1">
                <p className="text-[10px] text-muted-foreground mb-1.5">Disponibilité</p>
                {(['all', 'annee', 'saisonnier'] as const).map(v => (
                  <label key={v} className="flex items-center gap-2 text-xs cursor-pointer mb-1">
                    <input type="radio" name="beach_saison" value={v} checked={subFilters.beach_saison === v} onChange={() => setSubFilter('beach_saison', v)} />
                    {v === 'all' ? 'Tous' : v === 'annee' ? 'À l\'année' : 'Saisonnier'}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Green-volley sub-filters */}
        {showSubFilters === 'green_volley' && (
          <div className="absolute top-24 left-4 z-[400] bg-background/95 backdrop-blur-sm border border-border rounded-xl p-3 shadow-lg min-w-[220px]">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Green-Volley</p>
            <div className="flex flex-col gap-2">
              <div className="border-t border-border pt-2 mt-1">
                <p className="text-[10px] text-muted-foreground mb-1.5">Surface</p>
                {(['all', 'naturel', 'synthetique'] as const).map(v => (
                  <label key={v} className="flex items-center gap-2 text-xs cursor-pointer mb-1">
                    <input type="radio" name="green_sol" value={v} checked={subFilters.green_sol === v} onChange={() => setSubFilter('green_sol', v)} />
                    {v === 'all' ? 'Toutes' : v === 'naturel' ? '🌿 Gazon naturel' : '⚡ Synthétique'}
                  </label>
                ))}
              </div>
              <div className="border-t border-border pt-2 mt-1">
                <p className="text-[10px] text-muted-foreground mb-1.5">Disponibilité</p>
                {(['all', 'annee', 'saisonnier'] as const).map(v => (
                  <label key={v} className="flex items-center gap-2 text-xs cursor-pointer mb-1">
                    <input type="radio" name="green_saison" value={v} checked={subFilters.green_saison === v} onChange={() => setSubFilter('green_saison', v)} />
                    {v === 'all' ? 'Tous' : v === 'annee' ? 'À l\'année' : 'Saisonnier'}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        <UserLocationMarker />
        <AddMarkerController isActive={isAddingMode} location={newSpotLocation} onChange={onNewSpotLocationChange} />

        {isAddingMode && newSpotLocation && (
          <Marker
            position={newSpotLocation}
            draggable={true}
            icon={getAddMarkerIcon()}
            eventHandlers={{
              dragend: (e) => {
                const pos = e.target.getLatLng();
                if (onNewSpotLocationChange) onNewSpotLocationChange([pos.lat, pos.lng]);
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
            eventHandlers={{ click: () => onSelectSpot(spot.id) }}
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
