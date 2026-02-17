import { useState } from 'react';
import { Activity, BarChart3 } from 'lucide-react';
import { useMatchState } from '@/hooks/useMatchState';
import { ScoreBoard } from '@/components/ScoreBoard';
import { VolleyballCourt } from '@/components/VolleyballCourt';
import { HeatmapView } from '@/components/HeatmapView';

type Tab = 'match' | 'stats';

const Index = () => {
  const [tab, setTab] = useState<Tab>('match');
  const {
    points,
    selectedTeam,
    selectedPointType,
    score,
    stats,
    setSelectedTeam,
    setSelectedPointType,
    addPoint,
    undo,
    resetMatch,
  } = useMatchState();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-4 py-3 border-b border-border">
        <h1 className="text-lg font-black text-foreground tracking-tight text-center">
          🏐 Volley Tracker
        </h1>
      </header>

      {/* Tab bar */}
      <nav className="flex border-b border-border">
        <button
          onClick={() => setTab('match')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${
            tab === 'match'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground'
          }`}
        >
          <Activity size={16} /> Match
        </button>
        <button
          onClick={() => setTab('stats')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${
            tab === 'stats'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground'
          }`}
        >
          <BarChart3 size={16} /> Statistiques
        </button>
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-auto p-4 max-w-lg mx-auto w-full">
        {tab === 'match' ? (
          <div className="space-y-4">
            <ScoreBoard
              score={score}
              selectedTeam={selectedTeam}
              selectedPointType={selectedPointType}
              onSelectTeam={setSelectedTeam}
              onSelectPointType={setSelectedPointType}
              onUndo={undo}
              onReset={resetMatch}
              canUndo={points.length > 0}
            />
            <VolleyballCourt
              points={points}
              selectedTeam={selectedTeam}
              onCourtClick={addPoint}
            />
          </div>
        ) : (
          <HeatmapView points={points} stats={stats} />
        )}
      </main>
    </div>
  );
};

export default Index;
