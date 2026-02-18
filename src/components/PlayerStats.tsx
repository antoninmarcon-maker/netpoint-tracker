import { useMemo } from 'react';
import { Point, Player, isOffensiveAction } from '@/types/volleyball';

interface PlayerStatsProps {
  points: Point[];
  players: Player[];
  teamName: string;
}

export function PlayerStats({ points, players, teamName }: PlayerStatsProps) {
  const stats = useMemo(() => {
    return players.map(player => {
      // Points where this player was involved
      const playerPoints = points.filter(p => p.playerId === player.id);
      // Scored = blue team scored, offensive action, this player did it
      const scored = playerPoints.filter(p => p.team === 'blue' && p.type === 'scored');
      // Faults committed by this player = red team scored (any type), this player was responsible
      const faults = playerPoints.filter(p => p.team === 'red');
      // Also count when this player scored for blue via opponent fault
      const faultWins = playerPoints.filter(p => p.team === 'blue' && p.type === 'fault');

      const attacks = scored.filter(p => p.action === 'attack').length;
      const aces = scored.filter(p => p.action === 'ace').length;
      const blocks = scored.filter(p => p.action === 'block').length;
      const otherScored = scored.length - attacks - aces - blocks;
      const faultCount = faults.length;
      const total = scored.length + faultWins.length + faultCount;
      const efficiency = total > 0 ? ((scored.length + faultWins.length) / total * 100) : 0;

      return {
        player,
        scored: scored.length + faultWins.length,
        attacks,
        aces,
        blocks,
        otherScored,
        faults: faultCount,
        total,
        efficiency,
      };
    }).filter(s => s.total > 0)
      .sort((a, b) => b.scored - a.scored);
  }, [points, players]);

  if (stats.length === 0) {
    return null;
  }

  return (
    <div className="bg-card rounded-xl border border-border p-3 space-y-2">
      <p className="text-xs font-bold text-team-blue uppercase tracking-wider">
        📊 Stats Individuelles — {teamName}
      </p>
      <div className="space-y-1.5">
        {stats.map(s => (
          <div key={s.player.id} className="bg-secondary/30 rounded-lg p-2.5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-team-blue bg-team-blue/10 rounded px-1.5 py-0.5">#{s.player.number}</span>
                <span className="text-xs font-semibold text-foreground">{s.player.name || '—'}</span>
              </div>
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${s.efficiency >= 60 ? 'bg-green-500/10 text-green-500' : s.efficiency >= 40 ? 'bg-yellow-500/10 text-yellow-500' : 'bg-destructive/10 text-destructive'}`}>
                {s.efficiency.toFixed(0)}%
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1 text-center">
              {[
                ['Pts', s.scored, 'text-primary'],
                ['Att', s.attacks, 'text-foreground'],
                ['Ace', s.aces, 'text-foreground'],
                ['Blk', s.blocks, 'text-foreground'],
                ['Fts', s.faults, 'text-destructive'],
              ].map(([label, val, color]) => (
                <div key={label as string}>
                  <p className={`text-sm font-bold ${color}`}>{val as number}</p>
                  <p className="text-[9px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
