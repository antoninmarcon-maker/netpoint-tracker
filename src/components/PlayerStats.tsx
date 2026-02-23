import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Point, Player, SportType, OFFENSIVE_ACTIONS, FAULT_ACTIONS } from '@/types/sports';
import { useTranslation } from 'react-i18next';

interface PlayerStatsProps {
  points: Point[];
  players: Player[];
  teamName: string;
  sport?: SportType;
}

export function PlayerStats({ points, players, teamName }: PlayerStatsProps) {
  const { t } = useTranslation();
  const [expandedPlayers, setExpandedPlayers] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, { scored?: boolean; faults?: boolean; neutral?: boolean }>>({});
  const [sectionOpen, setSectionOpen] = useState(true);

  const stats = useMemo(() => {
    return players.map(player => {
      const playerPoints = points.filter(p => p.playerId === player.id);
      const scored = playerPoints.filter(p => p.team === 'blue' && p.type === 'scored');
      const faultWins = playerPoints.filter(p => p.team === 'blue' && p.type === 'fault');
      const negatives = playerPoints.filter(p => p.team === 'red');
      const neutrals = playerPoints.filter(p => p.type === 'neutral');

      const scoredCount = scored.length + faultWins.length;
      const negativeCount = negatives.length;

      const faultBreakdown: { label: string; count: number }[] = [];
      const negScoredActions = OFFENSIVE_ACTIONS;
      const negFaultActions = FAULT_ACTIONS;
      for (const a of negScoredActions) {
        const count = negatives.filter(p => p.type === 'scored' && p.action === a.key).length;
        if (count > 0) faultBreakdown.push({ label: a.label, count });
      }
      for (const a of negFaultActions) {
        const count = negatives.filter(p => p.type === 'fault' && p.action === a.key).length;
        if (count > 0) faultBreakdown.push({ label: a.label, count });
      }

      const total = scoredCount + negativeCount + neutrals.length;
      const efficiency = total > 0 ? (scoredCount / total * 100) : 0;

      const scoredBreakdown = OFFENSIVE_ACTIONS.map(a => ({
        label: a.label,
        count: scored.filter(p => p.action === a.key).length,
      })).filter(b => b.count > 0);

      if (faultWins.length > 0) {
        scoredBreakdown.push({ label: t('playerStats.faultsLabel'), count: faultWins.length });
      }

      const neutralBreakdown: { label: string; count: number }[] = [];
      const neutralLabels = new Map<string, string>();
      neutrals.forEach(p => { const label = p.customActionLabel || p.action; neutralLabels.set(label, label); });
      neutralLabels.forEach(label => {
        const count = neutrals.filter(p => (p.customActionLabel || p.action) === label).length;
        neutralBreakdown.push({ label, count });
      });

      return {
        player, scored: scoredCount, faults: negativeCount, neutralCount: neutrals.length,
        total: total, efficiency, scoredBreakdown, faultBreakdown, neutralBreakdown,
      };
    }).filter(s => s.total > 0).sort((a, b) => b.scored - a.scored);
  }, [points, players, t]);

  const togglePlayer = (playerId: string) => { setExpandedPlayers(prev => ({ ...prev, [playerId]: !prev[playerId] })); };
  const toggleSection = (playerId: string, section: 'scored' | 'faults' | 'neutral') => {
    setExpandedSections(prev => { const current = prev[playerId] || {}; return { ...prev, [playerId]: { ...current, [section]: !current[section] } }; });
  };

  if (stats.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-3 space-y-2">
      <button onClick={() => setSectionOpen(prev => !prev)} className="w-full flex items-center justify-between">
        <p className="text-xs font-bold text-team-blue uppercase tracking-wider">{t('playerStats.title', { team: teamName })}</p>
        {sectionOpen ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
      </button>

      {sectionOpen && (
        <div className="space-y-1.5">
          {stats.map(s => {
            const isOpen = expandedPlayers[s.player.id] ?? false;
            const sections = expandedSections[s.player.id] || {};
            return (
              <div key={s.player.id} className="bg-secondary/30 rounded-lg overflow-hidden">
                <button onClick={() => togglePlayer(s.player.id)} className="w-full flex items-center justify-between p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-team-blue bg-team-blue/10 rounded px-1.5 py-0.5">{s.player.name || '—'}</span>
                    <span className="text-[10px] text-muted-foreground">{s.scored} {t('playerStats.pts')} / {s.faults} {t('playerStats.fts')}{s.neutralCount > 0 ? ` / ${s.neutralCount} 📊` : ''}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${s.efficiency >= 60 ? 'bg-green-500/10 text-green-500' : s.efficiency >= 40 ? 'bg-yellow-500/10 text-yellow-500' : 'bg-destructive/10 text-destructive'}`}>{s.efficiency.toFixed(0)}%</span>
                    {isOpen ? <ChevronUp size={12} className="text-muted-foreground" /> : <ChevronDown size={12} className="text-muted-foreground" />}
                  </div>
                </button>
                {isOpen && (
                  <div className="px-2.5 pb-2.5 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="flex gap-1.5">
                      {s.scored > 0 && (<button onClick={() => toggleSection(s.player.id, 'scored')} className={`flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${sections.scored ? 'bg-primary/15 text-primary' : 'bg-primary/5 text-primary hover:bg-primary/10'}`}><span>⚡ {s.scored} {t('playerStats.pts')}</span>{sections.scored ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</button>)}
                      {s.faults > 0 && (<button onClick={() => toggleSection(s.player.id, 'faults')} className={`flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${sections.faults ? 'bg-destructive/15 text-destructive' : 'bg-destructive/5 text-destructive hover:bg-destructive/10'}`}><span>❌ {s.faults} {t('playerStats.fts')}</span>{sections.faults ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</button>)}
                      {s.neutralCount > 0 && (<button onClick={() => toggleSection(s.player.id, 'neutral')} className={`flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${sections.neutral ? 'bg-muted/50 text-foreground' : 'bg-muted/20 text-muted-foreground hover:bg-muted/30'}`}><span>📊 {s.neutralCount}</span>{sections.neutral ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</button>)}
                    </div>
                    {sections.scored && s.scoredBreakdown.length > 0 && (<div className="pl-2 space-y-0.5">{s.scoredBreakdown.map(b => (<div key={b.label} className="flex justify-between text-[11px]"><span className="text-muted-foreground">{b.label}</span><span className="font-bold text-foreground">{b.count}</span></div>))}</div>)}
                    {sections.neutral && s.neutralBreakdown.length > 0 && (<div className="pl-2 space-y-0.5">{s.neutralBreakdown.map(b => (<div key={b.label} className="flex justify-between text-[11px]"><span className="text-muted-foreground">{b.label}</span><span className="font-bold text-foreground">{b.count}</span></div>))}</div>)}
                    {sections.faults && s.faultBreakdown.length > 0 && (<div className="pl-2 space-y-0.5">{s.faultBreakdown.map(b => (<div key={b.label} className="flex justify-between text-[11px]"><span className="text-muted-foreground">{b.label}</span><span className="font-bold text-destructive">{b.count}</span></div>))}</div>)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
