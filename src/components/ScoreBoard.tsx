import { Undo2, RotateCcw, Flag } from 'lucide-react';
import { Team, PointType } from '@/types/volleyball';

interface ScoreBoardProps {
  score: { blue: number; red: number };
  selectedTeam: Team | null;
  selectedPointType: PointType;
  currentSetNumber: number;
  onSelectTeam: (team: Team) => void;
  onSelectPointType: (type: PointType) => void;
  onUndo: () => void;
  onReset: () => void;
  onEndSet: () => void;
  canUndo: boolean;
}

export function ScoreBoard({
  score,
  selectedTeam,
  selectedPointType,
  onSelectTeam,
  onSelectPointType,
  onUndo,
  onReset,
  onEndSet,
  canUndo,
  currentSetNumber,
}: ScoreBoardProps) {
  return (
    <div className="space-y-4">
      {/* Current set label */}
      <p className="text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">Set {currentSetNumber}</p>

      {/* Score display */}
      <div className="flex items-center justify-center gap-4">
        <div className="flex-1 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-team-blue">Bleue</p>
          <p className="text-5xl font-black text-team-blue tabular-nums">{score.blue}</p>
        </div>
        <div className="text-muted-foreground text-lg font-bold">VS</div>
        <div className="flex-1 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-team-red">Rouge</p>
          <p className="text-5xl font-black text-team-red tabular-nums">{score.red}</p>
        </div>
      </div>

      {/* Point type toggle */}
      <div className="flex gap-2 justify-center">
        <button
          onClick={() => onSelectPointType('scored')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
            selectedPointType === 'scored'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground'
          }`}
        >
          Point Marqué
        </button>
        <button
          onClick={() => onSelectPointType('fault')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
            selectedPointType === 'fault'
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-secondary text-secondary-foreground'
          }`}
        >
          Faute
        </button>
      </div>

      {/* Team buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => onSelectTeam('blue')}
          className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all active:scale-95 ${
            selectedTeam === 'blue'
              ? 'bg-team-blue text-team-blue-foreground team-blue-glow scale-105'
              : 'bg-team-blue/20 text-team-blue border-2 border-team-blue/30 hover:bg-team-blue/30'
          }`}
        >
          🔵 Équipe Bleue
        </button>
        <button
          onClick={() => onSelectTeam('red')}
          className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all active:scale-95 ${
            selectedTeam === 'red'
              ? 'bg-team-red text-team-red-foreground team-red-glow scale-105'
              : 'bg-team-red/20 text-team-red border-2 border-team-red/30 hover:bg-team-red/30'
          }`}
        >
          🔴 Équipe Rouge
        </button>
      </div>

      {/* Status message */}
      {selectedTeam && (
        <p className="text-center text-sm text-muted-foreground animate-pulse">
          Touchez le terrain pour placer le point
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 justify-center flex-wrap">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-30 transition-all"
        >
          <Undo2 size={16} /> Annuler
        </button>
        <button
          onClick={onEndSet}
          disabled={!canUndo}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 disabled:opacity-30 transition-all"
        >
          <Flag size={16} /> Fin du Set
        </button>
        <button
          onClick={onReset}
          disabled={!canUndo}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-30 transition-all"
        >
          <RotateCcw size={16} /> Reset
        </button>
      </div>
    </div>
  );
}
