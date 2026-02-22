import { useState, useEffect } from 'react';
import { Player } from '@/types/sports';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getPlayerNumber, getJerseyConfig } from '@/lib/savedPlayers';
import type { SportType } from '@/types/sports';

interface PlayerSelectorProps {
  players: Player[];
  prompt: string;
  onSelect: (playerId: string) => void;
  onSkip: () => void;
  sport?: SportType;
}

export function PlayerSelector({ players, prompt, onSelect, onSkip, sport = 'volleyball' }: PlayerSelectorProps) {
  const { t } = useTranslation();
  const [interactive, setInteractive] = useState(false);
  const jerseyEnabled = getJerseyConfig()[sport];

  useEffect(() => {
    const timer = setTimeout(() => setInteractive(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center sm:items-center p-4" onClick={() => interactive && onSkip()}>
      <div className="bg-card rounded-2xl p-4 max-w-sm w-full border border-border space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-foreground">{prompt}</p>
          <button onClick={onSkip} className="p-1 rounded-md text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {players.map(p => {
            const num = jerseyEnabled ? getPlayerNumber(p.id) : undefined;
            return (
              <button key={p.id} onClick={() => onSelect(p.id)} className="flex flex-col items-center gap-0.5 py-3 px-1 rounded-xl bg-team-blue/10 border border-team-blue/20 hover:bg-team-blue/20 active:scale-95 transition-all">
                {num && (
                  <span className="text-[10px] font-black text-team-blue/60">#{num}</span>
                )}
                <span className={`font-black text-team-blue ${num ? 'text-sm' : 'text-lg'}`}>{p.name || '—'}</span>
              </button>
            );
          })}
        </div>
        <button onClick={onSkip} className="w-full py-2 text-xs font-medium text-muted-foreground rounded-lg bg-secondary hover:bg-secondary/80 transition-all">
          {t('playerSelector.skip')}
        </button>
      </div>
    </div>
  );
}
