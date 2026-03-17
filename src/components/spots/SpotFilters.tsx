import { useState } from 'react';
import { MapPin, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const EXTERIOR_TYPES = ['beach', 'green_volley', 'outdoor_hard', 'outdoor_grass'];

export interface SubFilters {
  acces_libre: boolean;
  ext_beach: boolean;
  ext_herbe: boolean;
  ext_dur: boolean;
  beach_eclairage: boolean;
  beach_pmr: boolean;
  beach_saison: 'all' | 'annee' | 'saisonnier';
  green_sol: 'all' | 'naturel' | 'synthetique';
  green_saison: 'all' | 'annee' | 'saisonnier';
}

export const DEFAULT_SUB_FILTERS: SubFilters = {
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

export interface SpotFiltersState {
  showExterieur: boolean;
  showGymnase: boolean;
  showClubs: boolean;
  subFilters: SubFilters;
  radiusKm: number | null;
  showPending: boolean;
}

export const DEFAULT_FILTERS: SpotFiltersState = {
  showExterieur: true,
  showGymnase: true,
  showClubs: true,
  subFilters: DEFAULT_SUB_FILTERS,
  radiusKm: null,
  showPending: false,
};

function FilterPill({ active, onClick, children, size = 'md' }: { active: boolean; onClick: () => void; children: React.ReactNode; size?: 'sm' | 'md' }) {
  return (
    <button
      onClick={onClick}
      className={`flex-none px-3 py-1.5 rounded-full font-semibold tracking-wide border transition-all shadow-sm whitespace-nowrap ${
        size === 'sm' ? 'text-[10px]' : 'text-xs'
      } ${
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background/90 text-foreground border-border backdrop-blur-sm opacity-70 hover:opacity-100'
      }`}
    >
      {children}
    </button>
  );
}

interface SpotFiltersProps {
  filters: SpotFiltersState;
  onChange: (f: SpotFiltersState) => void;
  count: number;
  userPosition: [number, number] | null;
  isModerator?: boolean;
}

export default function SpotFilters({ filters, onChange, count, userPosition, isModerator }: SpotFiltersProps) {
  const [showSubPanel, setShowSubPanel] = useState(false);

  const set = <K extends keyof SpotFiltersState>(key: K, value: SpotFiltersState[K]) =>
    onChange({ ...filters, [key]: value });

  const setSub = <K extends keyof SubFilters>(key: K, value: SubFilters[K]) =>
    onChange({ ...filters, subFilters: { ...filters.subFilters, [key]: value } });

  const radiusOptions = [10, 25, 50] as const;

  return (
    <div className="absolute top-3 left-3 right-3 z-[400] flex flex-col gap-2 pointer-events-none">
      {/* Row 1: Main categories */}
      <div className="flex items-center gap-1.5 flex-wrap pointer-events-auto">
        <FilterPill active={filters.showExterieur} onClick={() => set('showExterieur', !filters.showExterieur)}>
          ☀️ Extérieur
        </FilterPill>
        {filters.showExterieur && (
          <button
            onClick={() => setShowSubPanel(p => !p)}
            className={`w-6 h-6 rounded-full text-[10px] flex items-center justify-center border transition-all ${
              showSubPanel
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background/90 border-border text-muted-foreground hover:bg-background'
            }`}
          >
            <SlidersHorizontal size={10} />
          </button>
        )}
        <FilterPill active={filters.showGymnase} onClick={() => set('showGymnase', !filters.showGymnase)}>
          🏟️ Gymnase
        </FilterPill>
        <FilterPill active={filters.showClubs} onClick={() => set('showClubs', !filters.showClubs)}>
          🏛️ Clubs
        </FilterPill>

        {isModerator && (
          <FilterPill active={filters.showPending} onClick={() => set('showPending', !filters.showPending)}>
            ⏳ En attente
          </FilterPill>
        )}

        <span className="text-[10px] text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full border border-border whitespace-nowrap pointer-events-auto">
          {count} terrains
        </span>
      </div>

      {/* Row 2: Quick filters */}
      <div className="flex items-center gap-1.5 flex-wrap pointer-events-auto">
        {filters.showExterieur && (
          <FilterPill active={filters.subFilters.acces_libre} onClick={() => setSub('acces_libre', !filters.subFilters.acces_libre)} size="sm">
            🔓 Libre accès
          </FilterPill>
        )}

        {/* Proximity radius */}
        {userPosition && (
          <>
            <span className="text-[9px] text-muted-foreground ml-1">📍</span>
            {radiusOptions.map(r => (
              <FilterPill
                key={r}
                active={filters.radiusKm === r}
                onClick={() => set('radiusKm', filters.radiusKm === r ? null : r)}
                size="sm"
              >
                {r} km
              </FilterPill>
            ))}
          </>
        )}
      </div>

      {/* Sub-filter panel */}
      {showSubPanel && filters.showExterieur && (
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-xl p-3 shadow-lg max-w-[260px] max-h-[50vh] overflow-y-auto pointer-events-auto">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Filtres extérieur</p>
            <button onClick={() => setShowSubPanel(false)} className="text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            <FilterPill active={filters.subFilters.ext_beach} onClick={() => setSub('ext_beach', !filters.subFilters.ext_beach)} size="sm">
              🏖️ Beach
            </FilterPill>
            <FilterPill active={filters.subFilters.ext_herbe} onClick={() => setSub('ext_herbe', !filters.subFilters.ext_herbe)} size="sm">
              🌿 Herbe
            </FilterPill>
            <FilterPill active={filters.subFilters.ext_dur} onClick={() => setSub('ext_dur', !filters.subFilters.ext_dur)} size="sm">
              🏗️ Dur
            </FilterPill>
          </div>

          {filters.subFilters.ext_beach && (
            <div className="border-t border-border pt-2 mb-2">
              <p className="text-[10px] text-muted-foreground mb-1.5 font-semibold">🏖️ Beach</p>
              <label className="flex items-center gap-2 text-xs cursor-pointer mb-1">
                <input type="checkbox" checked={filters.subFilters.beach_eclairage} onChange={e => setSub('beach_eclairage', e.target.checked)} className="rounded" />
                Éclairage
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer mb-1">
                <input type="checkbox" checked={filters.subFilters.beach_pmr} onChange={e => setSub('beach_pmr', e.target.checked)} className="rounded" />
                Accès PMR
              </label>
              <p className="text-[10px] text-muted-foreground mb-1 mt-1.5">Disponibilité</p>
              {(['all', 'annee', 'saisonnier'] as const).map(v => (
                <label key={v} className="flex items-center gap-2 text-xs cursor-pointer mb-1">
                  <input type="radio" name="beach_saison" value={v} checked={filters.subFilters.beach_saison === v} onChange={() => setSub('beach_saison', v)} />
                  {v === 'all' ? 'Tous' : v === 'annee' ? "À l'année" : 'Saisonnier'}
                </label>
              ))}
            </div>
          )}

          {filters.subFilters.ext_herbe && (
            <div className="border-t border-border pt-2 mb-2">
              <p className="text-[10px] text-muted-foreground mb-1.5 font-semibold">🌿 Herbe</p>
              <p className="text-[10px] text-muted-foreground mb-1">Surface</p>
              {(['all', 'naturel', 'synthetique'] as const).map(v => (
                <label key={v} className="flex items-center gap-2 text-xs cursor-pointer mb-1">
                  <input type="radio" name="green_sol" value={v} checked={filters.subFilters.green_sol === v} onChange={() => setSub('green_sol', v)} />
                  {v === 'all' ? 'Toutes' : v === 'naturel' ? '🌿 Naturel' : '⚡ Synthétique'}
                </label>
              ))}
              <p className="text-[10px] text-muted-foreground mb-1 mt-1.5">Disponibilité</p>
              {(['all', 'annee', 'saisonnier'] as const).map(v => (
                <label key={v} className="flex items-center gap-2 text-xs cursor-pointer mb-1">
                  <input type="radio" name="green_saison" value={v} checked={filters.subFilters.green_saison === v} onChange={() => setSub('green_saison', v)} />
                  {v === 'all' ? 'Tous' : v === 'annee' ? "À l'année" : 'Saisonnier'}
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
