import { SetData } from '@/types/volleyball';
import { ChevronDown, ChevronUp, Trophy } from 'lucide-react';
import { useState } from 'react';

interface SetHistoryProps {
  completedSets: SetData[];
  currentSetNumber: number;
  setsScore: { blue: number; red: number };
}

export function SetHistory({ completedSets, currentSetNumber, setsScore }: SetHistoryProps) {
  const [expandedSet, setExpandedSet] = useState<string | null>(null);

  if (completedSets.length === 0 && currentSetNumber === 1) return null;

  return (
    <div className="space-y-2">
      {/* Sets score summary */}
      <div className="flex items-center justify-between bg-card rounded-xl p-3 border border-border">
        <div className="flex items-center gap-2">
          <Trophy size={14} className="text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sets</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-black text-team-blue">{setsScore.blue}</span>
          <span className="text-xs text-muted-foreground">-</span>
          <span className="text-sm font-black text-team-red">{setsScore.red}</span>
        </div>
        <span className="text-xs text-muted-foreground">Set {currentSetNumber} en cours</span>
      </div>

      {/* Previous sets */}
      {completedSets.map(set => (
        <div key={set.id} className="bg-card rounded-xl border border-border overflow-hidden">
          <button
            onClick={() => setExpandedSet(expandedSet === set.id ? null : set.id)}
            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">SET {set.number}</span>
              <div className={`w-2 h-2 rounded-full ${set.winner === 'blue' ? 'bg-team-blue' : 'bg-team-red'}`} />
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-bold ${set.winner === 'blue' ? 'text-team-blue' : 'text-muted-foreground'}`}>
                {set.score.blue}
              </span>
              <span className="text-xs text-muted-foreground">-</span>
              <span className={`text-sm font-bold ${set.winner === 'red' ? 'text-team-red' : 'text-muted-foreground'}`}>
                {set.score.red}
              </span>
              {expandedSet === set.id ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
            </div>
          </button>
          {expandedSet === set.id && (
            <div className="px-3 pb-3 border-t border-border pt-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-team-blue font-semibold mb-1">Bleue</p>
                  <p className="text-muted-foreground">Marqués: {set.points.filter(p => p.team === 'blue' && p.type === 'scored').length}</p>
                  <p className="text-muted-foreground">Fautes: {set.points.filter(p => p.team === 'blue' && p.type === 'fault').length}</p>
                </div>
                <div>
                  <p className="text-team-red font-semibold mb-1">Rouge</p>
                  <p className="text-muted-foreground">Marqués: {set.points.filter(p => p.team === 'red' && p.type === 'scored').length}</p>
                  <p className="text-muted-foreground">Fautes: {set.points.filter(p => p.team === 'red' && p.type === 'fault').length}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
