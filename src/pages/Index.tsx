import { useState } from 'react';
import { Activity, BarChart3 } from 'lucide-react';
import { useMatchState } from '@/hooks/useMatchState';
import { ScoreBoard } from '@/components/ScoreBoard';
import { VolleyballCourt } from '@/components/VolleyballCourt';
import { HeatmapView } from '@/components/HeatmapView';
import { SetHistory } from '@/components/SetHistory';

type Tab = 'match' | 'stats';

const Index = () => {
  const [tab, setTab] = useState<Tab>('match');
  const {
    points,
    allPoints,
    selectedTeam,
    selectedPointType,
    selectedAction,
    score,
    stats,
    setsScore,
    currentSetNumber,
    completedSets,
    teamNames,
    sidesSwapped,
    chronoRunning,
    chronoSeconds,
    setSelectedTeam,
    setSelectedPointType,
    setSelectedAction,
    setTeamNames,
    addPoint,
    undo,
    endSet,
    resetMatch,
    switchSides,
    startChrono,
    pauseChrono,
  } = useMatchState();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 py-3 border-b border-border">
        <h1 className="text-lg font-black text-foreground tracking-tight text-center">
          🏐 Volley Tracker
        </h1>
      </header>

      <nav className="flex border-b border-border">
        <button
          onClick={() => setTab('match')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${
            tab === 'match' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
          }`}
        >
          <Activity size={16} /> Match
        </button>
        <button
          onClick={() => setTab('stats')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${
            tab === 'stats' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
          }`}
        >
          <BarChart3 size={16} /> Statistiques
        </button>
      </nav>

      <main className="flex-1 overflow-auto p-4 max-w-2xl mx-auto w-full">
        {tab === 'match' ? (
          <div className="space-y-4">
            <SetHistory
              completedSets={completedSets}
              currentSetNumber={currentSetNumber}
              setsScore={setsScore}
              teamNames={teamNames}
            />
            <ScoreBoard
              score={score}
              selectedTeam={selectedTeam}
              selectedPointType={selectedPointType}
              selectedAction={selectedAction}
              currentSetNumber={currentSetNumber}
              teamNames={teamNames}
              sidesSwapped={sidesSwapped}
              chronoRunning={chronoRunning}
              chronoSeconds={chronoSeconds}
              onSelectTeam={setSelectedTeam}
              onSelectPointType={setSelectedPointType}
              onSelectAction={setSelectedAction}
              onUndo={undo}
              onEndSet={endSet}
              onReset={resetMatch}
              onSwitchSides={switchSides}
              onStartChrono={startChrono}
              onPauseChrono={pauseChrono}
              onSetTeamNames={setTeamNames}
              canUndo={points.length > 0}
            />
            <VolleyballCourt
              points={points}
              selectedTeam={selectedTeam}
              sidesSwapped={sidesSwapped}
              teamNames={teamNames}
              onCourtClick={addPoint}
            />
          </div>
        ) : (
          <HeatmapView points={allPoints} completedSets={completedSets} currentSetPoints={points} currentSetNumber={currentSetNumber} stats={stats} teamNames={teamNames} />
        )}
      </main>
    </div>
  );
};

export default Index;
