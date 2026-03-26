import { useState, useRef, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { Loader2, Search, MapPin, X, MapPinned } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

interface SearchResult {
  type: 'spot' | 'location';
  lat: number;
  lon: number;
  label: string;
  sublabel?: string;
  spotId?: string;
}

interface MapSearchControlProps {
  isAddingMode?: boolean;
  onLocationSelected?: (latlng: [number, number]) => void;
  onSpotSelected?: (spotId: string) => void;
}

function rankByRelevance(spots: any[], query: string): any[] {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
  return spots
    .map(s => {
      const nameLower = (s.name || '').toLowerCase();
      const matchCount = words.filter(w => nameLower.includes(w)).length;
      return { ...s, matchCount };
    })
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, 5);
}

export default function MapSearchControl({ isAddingMode, onLocationSelected, onSpotSelected }: MapSearchControlProps) {
  const { t } = useTranslation();
  const map = useMap();
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Prevent Leaflet from capturing events on the search overlay
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    L.DomEvent.disableClickPropagation(el);
    L.DomEvent.disableScrollPropagation(el);
  }, []);

  // Debounced search: spots instantly (300ms), Nominatim after 500ms
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    // Abort previous in-flight requests
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    clearTimeout(debounceRef.current);
    setSearching(true);

    // Spots search: fast (300ms debounce)
    debounceRef.current = setTimeout(async () => {
      try {
        const words = q.split(/\s+/).filter(w => w.length >= 3);

        const spotsQuery = words.length === 0
          ? supabase.from('spots_with_coords').select('id, name, lat, lng, type')
              .eq('status', 'validated').ilike('name', `%${q}%`).limit(5)
          : supabase.from('spots_with_coords').select('id, name, lat, lng, type')
              .eq('status', 'validated')
              .or(words.map(w => `name.ilike.%${w}%`).join(','))
              .limit(30);

        const { data } = await spotsQuery;
        if (controller.signal.aborted) return;

        const spotResults: SearchResult[] = rankByRelevance(data || [], q).map(s => ({
          type: 'spot' as const,
          lat: s.lat,
          lon: s.lng,
          label: s.name,
          sublabel: s.type,
          spotId: s.id,
        }));

        setSearchResults(prev => {
          const locations = prev.filter(r => r.type === 'location');
          return [...spotResults, ...locations];
        });

        // Nominatim: slower (extra 200ms after spots), skip if query too short
        if (q.length >= 3) {
          setTimeout(async () => {
            try {
              const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=3&countrycodes=fr,ch,be,ca`,
                { headers: { 'User-Agent': 'MyVolley/1.0 (https://my-volley.com)' }, signal: controller.signal },
              );
              if (!res.ok || controller.signal.aborted) return;
              const nominatimData = await res.json();

              const locationResults: SearchResult[] = nominatimData.map((r: any) => ({
                type: 'location' as const,
                lat: parseFloat(r.lat),
                lon: parseFloat(r.lon),
                label: r.display_name,
              }));

              setSearchResults(prev => {
                const spots = prev.filter(r => r.type === 'spot');
                return [...spots, ...locationResults];
              });
            } catch {
              // Aborted or network error — ignore
            } finally {
              if (!controller.signal.aborted) setSearching(false);
            }
          }, 200);
        } else {
          setSearching(false);
        }
      } catch {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(debounceRef.current);
      controller.abort();
    };
  }, [searchQuery]);

  const handleSelectResult = (result: SearchResult) => {
    map.flyTo([result.lat, result.lon], 15, { animate: true, duration: 1.5 });

    if (result.type === 'spot' && result.spotId && onSpotSelected) {
      onSpotSelected(result.spotId);
    }

    if (isAddingMode && onLocationSelected) {
      onLocationSelected([result.lat, result.lon]);
    }

    setSearchResults([]);
    setSearchQuery('');
  };

  const handleClear = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div
      ref={containerRef}
      className="absolute left-[3.75rem] right-3 z-[500] pointer-events-auto"
      style={{ top: 'max(0.625rem, env(safe-area-inset-top))' }}
    >
      <form
        onSubmit={(e) => e.preventDefault()}
        className="flex bg-background/90 backdrop-blur-md border border-border/50 rounded-2xl overflow-hidden shadow-lg transition-all focus-within:shadow-xl focus-within:border-primary/30"
      >
        <div className="flex items-center pl-3.5 pr-1">
          <Search size={15} className="text-muted-foreground/60" />
        </div>
        <input
          type="search"
          enterKeyHint="search"
          placeholder={t('spots.searchMap', 'Rechercher un lieu ou terrain...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent border-0 outline-none px-2 h-10 text-sm text-foreground placeholder:text-muted-foreground/50 [&::-webkit-search-cancel-button]:hidden"
        />
        {searching ? (
          <div className="flex items-center pr-3">
            <Loader2 size={14} className="animate-spin text-muted-foreground" />
          </div>
        ) : searchQuery && (
          <button type="button" onClick={handleClear} className="flex items-center pr-3">
            <X size={14} className="text-muted-foreground/60" />
          </button>
        )}
      </form>

      {searchResults.length > 0 && (
        <div className="mt-1.5 bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
          {searchResults.map((res, i) => (
            <button
              key={`${res.type}-${res.spotId || i}`}
              type="button"
              className="w-full text-left px-4 py-3 border-b border-border/30 last:border-0 hover:bg-secondary/60 transition-colors flex items-start gap-3 active:bg-secondary"
              onClick={() => handleSelectResult(res)}
            >
              {res.type === 'spot' ? (
                <MapPinned size={14} className="mt-0.5 shrink-0 text-primary" />
              ) : (
                <MapPin size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
              )}
              <span className="text-[13px] text-foreground/80 line-clamp-2 leading-snug">
                {res.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
