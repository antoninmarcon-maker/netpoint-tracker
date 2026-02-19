import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Point, Player, SportType, OFFENSIVE_ACTIONS, FAULT_ACTIONS, BASKET_SCORED_ACTIONS, BASKET_FAULT_ACTIONS } from '@/types/sports';

interface PlayerStatsProps {
  points: Point[];
  players: Player[];
  teamName: string;
  sport?: SportType;
}

export function PlayerStats({ points, players, teamName, sport = 'volleyball' }: PlayerStatsProps) {
  const [expandedPlayers, setExpandedPlayers] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, { scored?: boolean; faults?: boolean }>>({});
  const isBasketball = sport === 'basketball';
  const [sectionOpen, setSectionOpen] = useState(true);

  const stats = useMemo(() => {
    return players.map(player => {
      const playerPoints = points.filter(p => p.playerId === player.id);
      const scored = playerPoints.filter(p => p.team === 'blue' && p.type === 'scored');
      const faultWins = playerPoints.filter(p => p.team === 'blue' && p.type === 'fault');
      const negatives = playerPoints.filter(p => p.team === 'red');

      const scoredCount = isBasketball
        ? scored.reduce((sum, p) => sum + (p.pointValue ?? 0), 0)
        : scored.length + faultWins.length;
      const negativeCount = negatives.length;
      const total = (isBasketball ? scored.length : scoredCount) + negativeCount;
      const efficiency = total > 0
        ? ((isBasketball ? scored.length : scoredCount) / total * 100)
        : 0;

      const scoredActions = isBasketball ? BASKET_SCORED_ACTIONS : OFFENSIVE_ACTIONS;
      const scoredBreakdown = scoredActions.map(a => ({
        label: a.label,
        count: scored.filter(p => p.action === a.key).length,
      })).filter(b => b.count > 0);

      if (!isBasketball && faultWins.length > 0) {
        scoredBreakdown.push({ label: 'Fautes adverses', count: faultWins.length });
      }

      const negScoredActions = isBasketball ? BASKET_SCORED_ACTIONS : OFFENSIVE_ACTIONS;
      const negFaultActions = isBasketball ? BASKET_FAULT_ACTIONS : FAULT_ACTIONS;
      const faultBreakdown = [
        ...negScoredActions.map(a => ({
          label: a.label,
          count: negatives.filter(p => p.type === 'scored' && p.action === a.key).length,
        })),
        ...negFaultActions.map(a => ({
          label: a.label,
          count: negatives.filter(p => p.type === 'fault' && p.action === a.key).length,
        })),
      ].filter(b => b.count > 0);

      return {
        player,
        scored: scoredCount,
        faults: negativeCount,
        total,
        efficiency,
        scoredBreakdown,
        faultBreakdown,
      };
    }).filter(s => s.total > 0)
      .sort((a, b) => b.scored - a.scored);
  }, [points, players, isBasketball]);

  const togglePlayer = (playerId: string) => {
    setExpandedPlayers(prev => ({ ...prev, [playerId]: !prev[playerId] }));
  };

  const toggleSection = (playerId: string, section: 'scored' | 'faults') => {
    setExpandedSections(prev => {
      const current = prev[playerId] || {};
      return { ...prev, [playerId]: { ...current, [section]: !current[section] } };
    });
  };

  if (stats.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-3 space-y-2">
      <button
        onClick={() => setSectionOpen(prev => !prev)}
        className="w-full flex items-center justify-between"
      >
        <p className="text-xs font-bold text-team-blue uppercase tracking-wider">
          📊 Stats Individuelles — {teamName}
        </p>
        {sectionOpen ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
      </button>

      {sectionOpen && (
        <div className="space-y-1.5">
          {stats.map(s => {
            const isOpen = expandedPlayers[s.player.id] ?? false;
            const sections = expandedSections[s.player.id] || {};
            return (
              <div key={s.player.id} className="bg-secondary/30 rounded-lg overflow-hidden">
                {/* Collapsible header */}
                <button
                  onClick={() => togglePlayer(s.player.id)}
                  className="w-full flex items-center justify-between p-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-team-blue bg-team-blue/10 rounded px-1.5 py-0.5">{s.player.name || '—'}</span>
                    <span className="text-[10px] text-muted-foreground">{s.scored} pts / {s.faults} fts</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${s.efficiency >= 60 ? 'bg-green-500/10 text-green-500' : s.efficiency >= 40 ? 'bg-yellow-500/10 text-yellow-500' : 'bg-destructive/10 text-destructive'}`}>
                      {s.efficiency.toFixed(0)}%
                    </span>
                    {isOpen ? <ChevronUp size={12} className="text-muted-foreground" /> : <ChevronDown size={12} className="text-muted-foreground" />}
                  </div>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="px-2.5 pb-2.5 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="flex gap-1.5">
                      {s.scored > 0 && (
                        <button
                          onClick={() => toggleSection(s.player.id, 'scored')}
                          className={`flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                            sections.scored ? 'bg-primary/15 text-primary' : 'bg-primary/5 text-primary hover:bg-primary/10'
                          }`}
                        >
                          <span>⚡ {s.scored} pts</span>
                          {sections.scored ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      )}
                      {s.faults > 0 && (
                        <button
                          onClick={() => toggleSection(s.player.id, 'faults')}
                          className={`flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                            sections.faults ? 'bg-destructive/15 text-destructive' : 'bg-destructive/5 text-destructive hover:bg-destructive/10'
                          }`}
                        >
                          <span>❌ {s.faults} fts</span>
                          {sections.faults ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      )}
                    </div>

                    {sections.scored && s.scoredBreakdown.length > 0 && (
                      <div className="pl-2 space-y-0.5">
                        {s.scoredBreakdown.map(b => (
                          <div key={b.label} className="flex justify-between text-[11px]">
                            <span className="text-muted-foreground">{b.label}</span>
                            <span className="font-bold text-foreground">{b.count}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {sections.faults && s.faultBreakdown.length > 0 && (
                      <div className="pl-2 space-y-0.5">
                        {s.faultBreakdown.map(b => (
                          <div key={b.label} className="flex justify-between text-[11px]">
                            <span className="text-muted-foreground">{b.label}</span>
                            <span className="font-bold text-destructive">{b.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
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
