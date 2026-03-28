import { useMemo } from 'react';
import { X, Zap, ChevronRight } from 'lucide-react';
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
  onClose?: () => void;
}

function SortChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all active:scale-95 ${
        active
          ? 'bg-secondary text-muted-foreground'
          : 'text-border hover:text-muted-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export default function SpotListView({ spots, selectedSpotId, onSelectSpot, userPosition, sortBy, onSortChange, onClose }: SpotListViewProps) {
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
    <div className="flex flex-col h-full glass-overlay md:border-l border-border/40 rounded-t-3xl md:rounded-none shadow-2xl md:shadow-none border-t border-border/40 md:border-t-0">
      {/* Drag handle — mobile only */}
      <div className="flex justify-center pt-2.5 pb-1 md:hidden">
        <div className="w-10 h-1 rounded-full bg-border" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 md:py-3 md:border-b md:border-border/40" style={{ paddingTop: undefined }}>
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-bold text-foreground">Terrains</h2>
          <span className="text-[10px] text-muted-foreground tabular-nums">{sorted.length} résultat{sorted.length !== 1 ? 's' : ''}</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Sort bar */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/30 bg-secondary/20">
        <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mr-1">Tri</span>
        {sortOptions.map(opt => (
          <SortChip key={opt.key} active={sortBy === opt.key} onClick={() => onSortChange(opt.key)}>
            {opt.label}
          </SortChip>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mb-3">
              <span className="text-lg">🏐</span>
            </div>
            <p className="text-sm text-muted-foreground">Aucun terrain trouvé</p>
            <p className="text-[11px] text-muted-foreground/60 mt-1">Essayez d'ajuster vos filtres</p>
          </div>
        )}

        {sorted.map((spot, i) => {
          const typeInfo = (spot.type ? SPOT_TYPE_CONFIG[spot.type] : null) || { emoji: '📍', label: 'Terrain', bg: 'bg-gray-500', hex: '#6b7280' };
          const isSelected = spot.id === selectedSpotId;

          return (
            <button
              key={spot.id}
              onClick={() => spot.id && onSelectSpot(spot.id)}
              className={`w-full text-left px-4 py-3 border-b border-border/20 transition-all hover:bg-secondary/40 active:bg-secondary/60 group ${
                isSelected ? 'bg-primary/5 border-l-[3px] border-l-primary' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${typeInfo.bg} flex items-center justify-center text-sm shadow-sm flex-none`}>
                  {typeInfo.emoji}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground truncate leading-tight">{spot.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{typeInfo.label}</span>
                    {spot.equip_acces_libre && (
                      <span className="text-[9px] text-green-600 dark:text-green-400 font-medium">🔓 Libre</span>
                    )}
                    {spot.equip_eclairage && (
                      <Zap size={9} className="text-yellow-500" />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-none">
                  {spot.distance != null && (
                    <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                      {formatDistance(spot.distance)}
                    </span>
                  )}
                  <ChevronRight size={14} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
