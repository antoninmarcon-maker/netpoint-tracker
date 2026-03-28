import { useState, useEffect } from 'react';
import { Player } from '@/types/sports';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { getPlayerNumber, getJerseyConfig } from '@/lib/savedPlayers';
import type { SportType, Team } from '@/types/sports';

interface PlayerSelectorProps {
  players: Player[];
  prompt: string;
  onSelect: (playerId: string) => void;
  onSkip: () => void;
  sport?: SportType;
  team?: Team | null;
  teamName?: string;
}

export function PlayerSelector({ players, prompt, onSelect, onSkip, sport = 'volleyball', team, teamName }: PlayerSelectorProps) {
  const { t } = useTranslation();
  const [interactive, setInteractive] = useState(false);
  const jerseyEnabled = getJerseyConfig()[sport];

  useEffect(() => {
    const timer = setTimeout(() => setInteractive(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const colorClass = team === 'red' ? 'team-red' : 'team-blue';

  return (
    <Dialog open onOpenChange={(open) => { if (!open && interactive) onSkip(); }}>
      <DialogContent className={`max-w-sm rounded-2xl border-2 ${team === 'red' ? 'border-team-red/30' : 'border-team-blue/30'}`}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">
            {teamName && <span className={`mr-1 ${team === 'red' ? 'text-team-red' : 'text-team-blue'}`}>[{teamName}]</span>}
            {prompt}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {players.map(p => {
            const num = jerseyEnabled ? (getPlayerNumber(p.id) || p.number) : undefined;
            return (
              <button key={p.id} onClick={() => onSelect(p.id)} className={`flex flex-col items-center gap-0.5 py-3 px-1 rounded-xl bg-${colorClass}/10 border border-${colorClass}/20 hover:bg-${colorClass}/20 active:scale-95 transition-all`}>
                {num && (
                  <span className={`text-[10px] font-black text-${colorClass}/60`}>#{num}</span>
                )}
                <span className={`font-black text-${colorClass} ${num ? 'text-sm' : 'text-lg'}`}>{p.name || '—'}</span>
              </button>
            );
          })}
        </div>
        <button onClick={onSkip} className="w-full py-2 text-xs font-medium text-muted-foreground rounded-lg bg-secondary hover:bg-secondary/80 transition-all">
          {t('playerSelector.skip')}
        </button>
      </DialogContent>
    </Dialog>
  );
}
