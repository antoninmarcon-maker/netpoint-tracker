import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Point, Player, SportType, OFFENSIVE_ACTIONS, FAULT_ACTIONS, RallyAction } from '@/types/sports';
import { useTranslation } from 'react-i18next';
import { RatingDots } from '@/components/RatingDot';
import { getMatch } from '@/lib/matchStorage';
import { getPlayerNumber } from '@/lib/savedPlayers';

interface PlayerStatsProps {
  points: Point[];
  players: Player[];
  teamName: string;
  sport?: SportType;
  matchId?: string;
  showRatings?: boolean;
}

export function PlayerStats({ points, players, teamName, matchId, showRatings = true, sport = 'volleyball' }: PlayerStatsProps) {
  const { t } = useTranslation();
  const [expandedPlayers, setExpandedPlayers] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, { scored?: boolean; faults?: boolean; neutral?: boolean }>>({});
  const [sectionOpen, setSectionOpen] = useState(true);

  // Merge current roster with "ghost" players found in points but missing from roster
  // Recover names from persisted aliases and jersey-based fallback
  const allPlayers = useMemo(() => {
    const storedMatch = matchId ? getMatch(matchId) : null;
    const storedPlayers = storedMatch?.players ?? [];
    const aliasById = storedMatch?.metadata?.playerAliases ?? {};
    const knownIds = new Set(players.map(p => p.id));
    const knownNameByNumber = new Map<string, string>();

    [...players, ...storedPlayers].forEach((player) => {
      const number = player.number || getPlayerNumber(player.id);
      if (number && player.name) knownNameByNumber.set(number, player.name);
    });

    const ghostPlayers: Player[] = [];

    points.forEach((p) => {
      if (!p.playerId || knownIds.has(p.playerId)) return;
      knownIds.add(p.playerId);

      const stored = storedPlayers.find(sp => sp.id === p.playerId);
      const jersey = stored?.number || getPlayerNumber(p.playerId);
      const nameFromNumber = jersey ? knownNameByNumber.get(jersey) : undefined;
      const resolvedName = stored?.name || aliasById[p.playerId] || nameFromNumber || `#${p.playerId.slice(0, 4)}`;

      ghostPlayers.push({
        id: p.playerId,
        name: resolvedName,
        ...(jersey ? { number: jersey } : {}),
      });
    });

    return [...players, ...ghostPlayers];
  }, [players, points, matchId]);

  const stats = useMemo(() => {
    return allPlayers.map(player => {
      const playerScoredActions: (RallyAction & { rating?: string })[] = [];
      const playerFaultWins: (RallyAction & { rating?: string })[] = [];
      const playerNegatives: (RallyAction & { rating?: string })[] = [];
      const playerNeutrals: (RallyAction & { rating?: string })[] = [];

      points.forEach(p => {
        const actions = (p.rallyActions && p.rallyActions.length > 0)
          ? p.rallyActions
          : [{ team: p.team, type: p.type, action: p.action, playerId: p.playerId, customActionLabel: p.customActionLabel, rating: (p as any).rating }];

        actions.forEach(a => {
          if (a.playerId !== player.id) return;

          if (a.type === 'neutral') {
            playerNeutrals.push(a);
          } else if (a.type === 'scored' && a.team === 'blue') {
            // Blue player scored actively (attack, ace, block…) → positive
            playerScoredActions.push(a);
          } else if (a.type === 'fault' && a.team === 'blue') {
            // Blue team got a point from red's fault (no blue player committed it)
            // If somehow assigned to a blue player, count as a win
            playerFaultWins.push(a);
          } else if (a.type === 'fault' && a.team === 'red') {
            // Red got the point because a blue player faulted (out, net, etc.) → NEGATIVE
            playerNegatives.push(a);
          } else if (a.type === 'scored' && a.team === 'red') {
            // Red scored actively against this blue player → negative
            playerNegatives.push(a);
          }
        });
      });

      const scoredCount = playerScoredActions.length + playerFaultWins.length;
      const negativeCount = playerNegatives.length;

      const faultBreakdown: { label: string; count: number; ratingItems: { rating?: string }[] }[] = [];
      const negScoredActions = OFFENSIVE_ACTIONS;
      const negFaultActions = FAULT_ACTIONS;

      for (const a of negScoredActions) {
        const actionPoints = playerNegatives.filter(p => p.type === 'scored' && p.action === a.key);
        if (actionPoints.length > 0) {
          faultBreakdown.push({ label: a.label, count: actionPoints.length, ratingItems: actionPoints });
        }
      }
      for (const a of negFaultActions) {
        const actionPoints = playerNegatives.filter(p => p.type === 'fault' && p.action === a.key);
        if (actionPoints.length > 0) {
          faultBreakdown.push({ label: a.label, count: actionPoints.length, ratingItems: actionPoints });
        }
      }

      const total = scoredCount + negativeCount + playerNeutrals.length;
      const efficiency = total > 0 ? (scoredCount / total * 100) : 0;

      const scoredBreakdown = OFFENSIVE_ACTIONS.map(a => {
        const actionPoints = playerScoredActions.filter(p => p.action === a.key);
        if (actionPoints.length === 0) return null;
        return { label: a.label, count: actionPoints.length, ratingItems: actionPoints as { rating?: string }[] };
      }).filter((b): b is { label: string; count: number; ratingItems: { rating?: string }[] } => b !== null);

      if (playerFaultWins.length > 0) {
        scoredBreakdown.push({ label: t('playerStats.faultsLabel'), count: playerFaultWins.length, ratingItems: [] });
      }

      const neutralBreakdown: { label: string; count: number; ratingItems: { rating?: string }[] }[] = [];
      const neutralLabels = new Set<string>();
      playerNeutrals.forEach(p => neutralLabels.add(p.customActionLabel || p.action));

      neutralLabels.forEach(label => {
        const matchingPoints = playerNeutrals.filter(p => (p.customActionLabel || p.action) === label);
        neutralBreakdown.push({ label, count: matchingPoints.length, ratingItems: matchingPoints });
      });

      return {
        player, scored: scoredCount, faults: negativeCount, neutralCount: playerNeutrals.length,
        total: total, efficiency, scoredBreakdown, faultBreakdown, neutralBreakdown,
      };
    }).filter(s => s.total > 0).sort((a, b) => b.scored - a.scored);
  }, [points, allPlayers, t, showRatings, sport]);

  

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
                    {sections.scored && s.scoredBreakdown.length > 0 && (<div className="pl-2 space-y-0.5">{s.scoredBreakdown.map(b => (<div key={b.label} className="flex items-center justify-between text-[11px]"><span className="text-muted-foreground flex items-center gap-1">{b.label}<RatingDots items={b.ratingItems} showRatings={showRatings} /></span><span className="font-bold text-foreground">{b.count}</span></div>))}</div>)}
                    {sections.neutral && s.neutralBreakdown.length > 0 && (<div className="pl-2 space-y-0.5">{s.neutralBreakdown.map(b => (<div key={b.label} className="flex items-center justify-between text-[11px]"><span className="text-muted-foreground flex items-center gap-1">{b.label}<RatingDots items={b.ratingItems} showRatings={showRatings} /></span><span className="font-bold text-foreground">{b.count}</span></div>))}</div>)}
                    {sections.faults && s.faultBreakdown.length > 0 && (<div className="pl-2 space-y-0.5">{s.faultBreakdown.map(b => (<div key={b.label} className="flex items-center justify-between text-[11px]"><span className="text-muted-foreground flex items-center gap-1">{b.label}<RatingDots items={b.ratingItems} showRatings={showRatings} /></span><span className="font-bold text-destructive">{b.count}</span></div>))}</div>)}
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
