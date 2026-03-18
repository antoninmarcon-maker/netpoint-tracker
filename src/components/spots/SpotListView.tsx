import { useMemo } from 'react';
import { MapPin, Zap, Leaf, Building2 } from 'lucide-react';
import { getDistance } from '@/lib/filterSpots';
import { SPOT_TYPE_CONFIG } from '@/lib/spotTypes';
import type { Tables } from '@/integrations/supabase/types';

type Spot = Tables<'spots_with_coords'>;

interface SpotListViewProps {
  spots: Spot[];
  selectedSpotId: string | null;
  onSelectSpot: (id: string) => void;
  userPosition: [number, number] | null;
  sortBy: 'distance' | 'type' | 'name';
  onSortChange: (sort: 'distance' | 'type' | 'name') => void;
}

export default function SpotListView({ spots, selectedSpotId, onSelectSpot, userPosition, sortBy, onSortChange }: SpotListViewProps) {
  const sorted = useMemo(() => {
    const withDist = spots.map(s => ({
      ...s,
      distance: userPosition && s.lat != null && s.lng != null
        ? getDistance(userPosition[0], userPosition[1], s.lat, s.lng)
        : null,
    }));
    return [...withDist].sort((a, b) => {
      if (sortBy === 'distance' && a.distance != null && b.distance != null) return a.distance - b.distance;
      if (sortBy === 'type') return (a.type || '').localeCompare(b.type || '');
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [spots, userPosition, sortBy]);

  const sortOptions: { key: typeof sortBy; label: string }[] = [
    ...(userPosition ? [{ key: 'distance' as const, label: '📍 Distance' }] : []),
    { key: 'type', label: '🏷️ Type' },
    { key: 'name', label: '🔤 Nom' },
  ];

  return (
    <div className="flex flex-col h-full bg-background border-l border-border">
      {/* Sort bar */}
      <div className="flex items-center gap-1.5 p-2 border-b border-border bg-secondary/30">
        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mr-1">Tri</span>
        {sortOptions.map(opt => (
          <button
            key={opt.key}
            onClick={() => onSortChange(opt.key)}
            className={`px-2 py-1 rounded-full text-[10px] font-semibold border transition-all ${
              sortBy === opt.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">Aucun terrain trouvé</p>
        )}
        {sorted.map(spot => {
          const typeInfo = SPOT_TYPE_CONFIG[spot.type] || { emoji: '📍', label: 'Terrain', bg: 'bg-gray-500' };
          const isSelected = spot.id === selectedSpotId;

          return (
            <button
              key={spot.id}
              onClick={() => onSelectSpot(spot.id)}
              className={`w-full text-left px-3 py-3 border-b border-border/50 transition-colors hover:bg-secondary/40 ${
                isSelected ? 'bg-primary/10 border-l-2 border-l-primary' : ''
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span className="text-lg mt-0.5">{typeInfo.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{spot.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground bg-secondary/60 px-1.5 py-0.5 rounded">{typeInfo.label}</span>
                    {spot.equip_acces_libre && (
                      <span className="text-[10px] text-green-600 dark:text-green-400">🔓 Libre</span>
                    )}
                    {spot.equip_eclairage && (
                      <Zap size={10} className="text-yellow-500" />
                    )}
                  </div>
                </div>
                {spot.distance != null && (
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-1 font-mono">
                    {spot.distance < 1 ? `${Math.round(spot.distance * 1000)} m` : `${spot.distance.toFixed(1)} km`}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
