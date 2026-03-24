import { useState } from 'react';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';

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
  showClubs: boolean;
  subFilters: SubFilters;
  showPending: boolean;
}

export const DEFAULT_FILTERS: SpotFiltersState = {
  showExterieur: true,
  showClubs: false,
  subFilters: DEFAULT_SUB_FILTERS,
  showPending: false,
};

function Chip({ active, onClick, children, variant = 'default' }: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'default' | 'small' | 'icon';
}) {
  const base = "flex-none rounded-full font-semibold tracking-wide border transition-all select-none active:scale-95";
  const sizing = variant === 'icon'
    ? 'w-8 h-8 flex items-center justify-center'
    : variant === 'small'
      ? 'px-2.5 py-1 text-[10px]'
      : 'px-3 py-1.5 text-[11px]';

  const colors = active
    ? 'bg-foreground text-background border-foreground shadow-sm'
    : 'bg-background/90 text-foreground/70 border-border/60 backdrop-blur-md hover:bg-background hover:text-foreground';

  return (
    <button onClick={onClick} className={`${base} ${sizing} ${colors}`}>
      {children}
    </button>
  );
}

function RadioOption({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2.5 text-[12px] cursor-pointer py-1 text-foreground/80 hover:text-foreground transition-colors">
      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
        checked ? 'border-primary bg-primary' : 'border-border'
      }`}>
        {checked && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
      </span>
      {label}
    </label>
  );
}

function CheckOption({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2.5 text-[12px] cursor-pointer py-1 text-foreground/80 hover:text-foreground transition-colors">
      <span className={`w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all ${
        checked ? 'border-primary bg-primary' : 'border-border'
      }`}>
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {label}
    </label>
  );
}

interface SpotFiltersProps {
  filters: SpotFiltersState;
  onChange: (f: SpotFiltersState) => void;
  count: number;
  isModerator?: boolean;
}

export default function SpotFilters({ filters, onChange, count, isModerator }: SpotFiltersProps) {
  const [showSubPanel, setShowSubPanel] = useState(false);

  const set = <K extends keyof SpotFiltersState>(key: K, value: SpotFiltersState[K]) =>
    onChange({ ...filters, [key]: value });

  const setSub = <K extends keyof SubFilters>(key: K, value: SubFilters[K]) =>
    onChange({ ...filters, subFilters: { ...filters.subFilters, [key]: value } });

  const hasActiveSubFilters = !filters.subFilters.ext_beach || !filters.subFilters.ext_herbe ||
    !filters.subFilters.ext_dur || filters.subFilters.beach_eclairage || filters.subFilters.beach_pmr ||
    filters.subFilters.beach_saison !== 'all' || filters.subFilters.green_sol !== 'all' ||
    filters.subFilters.green_saison !== 'all';

  return (
    <div className="absolute left-0 right-0 z-[400] flex flex-col gap-1.5 pointer-events-none px-3" style={{ top: 'calc(max(0.625rem, env(safe-area-inset-top)) + 3rem)' }}>
      {/* Main filter row — horizontal scroll */}
      <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pointer-events-auto pb-0.5">
        <Chip active={filters.showExterieur} onClick={() => set('showExterieur', !filters.showExterieur)}>
          ☀️ Extérieur
        </Chip>

        {filters.showExterieur && (
          <Chip
            active={showSubPanel || hasActiveSubFilters}
            onClick={() => setShowSubPanel(p => !p)}
            variant="icon"
          >
            <SlidersHorizontal size={13} />
          </Chip>
        )}

        <Chip active={filters.showClubs} onClick={() => set('showClubs', !filters.showClubs)}>
          🏛️ Clubs
        </Chip>

        {filters.showExterieur && (
          <Chip active={filters.subFilters.acces_libre} onClick={() => setSub('acces_libre', !filters.subFilters.acces_libre)} variant="small">
            🔓 Libre accès
          </Chip>
        )}

        {isModerator && (
          <Chip active={filters.showPending} onClick={() => set('showPending', !filters.showPending)} variant="small">
            ⏳ En attente
          </Chip>
        )}

        {/* Count badge */}
        <span className="flex-none text-[10px] text-muted-foreground bg-background/80 backdrop-blur-md px-2 py-1 rounded-full border border-border/40 whitespace-nowrap font-medium tabular-nums">
          {count} terrain{count !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Sub-filter panel */}
      {showSubPanel && filters.showExterieur && (
        <div className="pointer-events-auto bg-background/95 backdrop-blur-xl border border-border/60 rounded-2xl p-4 shadow-xl w-[min(calc(100vw-1.5rem),280px)] max-h-[45vh] overflow-y-auto animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-foreground tracking-tight">Filtres extérieur</p>
            <button onClick={() => setShowSubPanel(false)} className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors">
              <X size={12} />
            </button>
          </div>

          {/* Surface type chips */}
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Surface</p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            <Chip active={filters.subFilters.ext_beach} onClick={() => setSub('ext_beach', !filters.subFilters.ext_beach)} variant="small">
              🏖️ Beach
            </Chip>
            <Chip active={filters.subFilters.ext_herbe} onClick={() => setSub('ext_herbe', !filters.subFilters.ext_herbe)} variant="small">
              🌿 Herbe
            </Chip>
            <Chip active={filters.subFilters.ext_dur} onClick={() => setSub('ext_dur', !filters.subFilters.ext_dur)} variant="small">
              🏗️ Dur
            </Chip>
          </div>

          {filters.subFilters.ext_beach && (
            <div className="border-t border-border/40 pt-3 mb-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">🏖️ Beach</p>
              <div className="space-y-0.5 mb-2">
                <CheckOption label="Éclairage" checked={filters.subFilters.beach_eclairage} onChange={v => setSub('beach_eclairage', v)} />
                <CheckOption label="Accès PMR" checked={filters.subFilters.beach_pmr} onChange={v => setSub('beach_pmr', v)} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 mb-1">Disponibilité</p>
              <div className="space-y-0.5">
                <RadioOption label="Tous" checked={filters.subFilters.beach_saison === 'all'} onChange={() => setSub('beach_saison', 'all')} />
                <RadioOption label="À l'année" checked={filters.subFilters.beach_saison === 'annee'} onChange={() => setSub('beach_saison', 'annee')} />
                <RadioOption label="Saisonnier" checked={filters.subFilters.beach_saison === 'saisonnier'} onChange={() => setSub('beach_saison', 'saisonnier')} />
              </div>
            </div>
          )}

          {filters.subFilters.ext_herbe && (
            <div className="border-t border-border/40 pt-3 mb-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">🌿 Herbe</p>
              <p className="text-[10px] text-muted-foreground mb-1">Surface</p>
              <div className="space-y-0.5">
                <RadioOption label="Toutes" checked={filters.subFilters.green_sol === 'all'} onChange={() => setSub('green_sol', 'all')} />
                <RadioOption label="🌿 Naturel" checked={filters.subFilters.green_sol === 'naturel'} onChange={() => setSub('green_sol', 'naturel')} />
                <RadioOption label="⚡ Synthétique" checked={filters.subFilters.green_sol === 'synthetique'} onChange={() => setSub('green_sol', 'synthetique')} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 mb-1">Disponibilité</p>
              <div className="space-y-0.5">
                <RadioOption label="Tous" checked={filters.subFilters.green_saison === 'all'} onChange={() => setSub('green_saison', 'all')} />
                <RadioOption label="À l'année" checked={filters.subFilters.green_saison === 'annee'} onChange={() => setSub('green_saison', 'annee')} />
                <RadioOption label="Saisonnier" checked={filters.subFilters.green_saison === 'saisonnier'} onChange={() => setSub('green_saison', 'saisonnier')} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
