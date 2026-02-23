import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Activity, BarChart3, HelpCircle, X, ArrowLeft } from 'lucide-react';
import { useMatchState } from '@/hooks/useMatchState';
import { ScoreBoard } from '@/components/ScoreBoard';
import { VolleyballCourt } from '@/components/VolleyballCourt';
import { HeatmapView } from '@/components/HeatmapView';
import { SetHistory } from '@/components/SetHistory';
import { PlayerRoster } from '@/components/PlayerRoster';
import { PlayerSelector } from '@/components/PlayerSelector';
import { AiAnalysis } from '@/components/AiAnalysis';
import { AuthDialog } from '@/components/AuthDialog';
import { getMatch, saveMatch } from '@/lib/matchStorage';
import { getCloudMatchById, saveCloudMatch } from '@/lib/cloudStorage';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { MatchSummary, Player } from '@/types/sports';
import { useTranslation } from 'react-i18next';

type Tab = 'match' | 'stats';

const Index = () => {
  const { t } = useTranslation();
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('match');
  const [showHelp, setShowHelp] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showAuthForAi, setShowAuthForAi] = useState(false);
  const [loading, setLoading] = useState(true);
  const [matchReady, setMatchReady] = useState(false);

  useEffect(() => {
    if (!matchId) { setLoading(false); return; }
    const ensureMatchLocal = async () => {
      if (getMatch(matchId)) { setMatchReady(true); setLoading(false); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const cloudMatch = await getCloudMatchById(matchId);
        if (cloudMatch) { saveMatch(cloudMatch); setMatchReady(true); setLoading(false); return; }
      }
      setMatchReady(false); setLoading(false);
    };
    ensureMatchLocal();
  }, [matchId]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const matchState = useMatchState(matchId ?? '', matchReady);

  const {
    points, allPoints, selectedTeam, selectedPointType, selectedAction,
    score, stats, setsScore, currentSetNumber, completedSets,
    teamNames, sidesSwapped, chronoRunning, chronoSeconds,
    players, pendingPoint, servingTeam, sport,
    setTeamNames, setPlayers, selectAction, cancelSelection, addPoint,
    assignPlayer, skipPlayerAssignment,
    undo, endSet, startNewSet, waitingForNewSet, resetMatch, switchSides, startChrono, pauseChrono,
  } = matchState;

  const matchData2 = getMatch(matchId ?? '');
  const metadata = matchData2?.metadata;

  // Auto-point for service faults or when court is disabled or placeOnCourt=false
  const SERVICE_FAULT_ACTIONS = ['service_miss'];
  useEffect(() => {
    if (!selectedTeam || !selectedAction) {
      delete (window as any).__pendingPlaceOnCourt;
      return;
    }
    const isAutoPoint =
      metadata?.hasCourt === false ||
      SERVICE_FAULT_ACTIONS.includes(selectedAction) ||
      (window as any).__pendingPlaceOnCourt === false;
    if (isAutoPoint) {
      delete (window as any).__pendingPlaceOnCourt;
      addPoint(0.5, 0.5);
    }
  }, [matchState.selectedPointType, selectedTeam, selectedAction, addPoint]);

  // Player assignment logic
  useEffect(() => {
    if (!pendingPoint || players.length === 0) return;

    // Respect explicit assignToPlayer=false
    if ((window as any).__pendingCustomAssignToPlayer === false) {
      delete (window as any).__pendingCustomAssignToPlayer;
      skipPlayerAssignment();
      return;
    }
    if ((window as any).__pendingCustomAssignToPlayer !== undefined) {
      delete (window as any).__pendingCustomAssignToPlayer;
    }

    // Volleyball: show selector for blue scored, red scored, red fault, neutral
    const isBlueScored = pendingPoint.team === 'blue' && pendingPoint.type === 'scored';
    const isRedScored = pendingPoint.team === 'red' && pendingPoint.type === 'scored';
    const isRedFault = pendingPoint.team === 'red' && pendingPoint.type === 'fault';
    const isNeutral = pendingPoint.type === 'neutral';
    if (!isBlueScored && !isRedScored && !isRedFault && !isNeutral) {
      skipPlayerAssignment();
    }
  }, [pendingPoint, players, skipPlayerAssignment, assignPlayer]);

  // Cloud save
  const cloudSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCloudSaveRef = useRef<string>('');

  const saveToCloud = useCallback(() => {
    if (!user || !matchId) return;
    const match = getMatch(matchId);
    if (!match) return;
    const snapshot = JSON.stringify(match);
    if (snapshot === lastCloudSaveRef.current) return;
    lastCloudSaveRef.current = snapshot;
    saveCloudMatch(user.id, match).catch(err =>
      { if (import.meta.env.DEV) console.error('[CloudSync] save failed:', err); }
    );
  }, [user, matchId]);

  useEffect(() => {
    if (!user || !matchId || !matchReady) return;
    if (cloudSaveTimerRef.current) clearTimeout(cloudSaveTimerRef.current);
    cloudSaveTimerRef.current = setTimeout(() => { saveToCloud(); }, 3000);
    return () => { if (cloudSaveTimerRef.current) clearTimeout(cloudSaveTimerRef.current); };
  }, [points, completedSets, players, teamNames, chronoSeconds, sidesSwapped, user, matchId, matchReady, saveToCloud]);

  useEffect(() => {
    return () => {
      if (user && matchId) {
        const match = getMatch(matchId);
        if (match) { saveCloudMatch(user.id, match).catch(() => {}); }
      }
    };
  }, [user, matchId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">{t('matchPage.loadingMatch')}</div>
      </div>
    );
  }

  if (!matchId || !matchReady) {
    return <Navigate to="/" replace />;
  }

  const matchData = getMatch(matchId);
  const isFinished = matchData?.finished ?? false;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-background px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] border-b border-border flex items-center justify-between">
        <button onClick={() => navigate('/')} className="p-1.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-black text-foreground tracking-tight text-center">🏐 My Volley</h1>
        {tab === 'match' ? (
          <button onClick={() => setShowHelp(true)} className="p-1.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <HelpCircle size={18} />
          </button>
        ) : <div className="w-[30px]" />}
      </header>

      <nav className="sticky top-[49px] z-40 bg-background flex border-b border-border">
        <button onClick={() => setTab('match')} className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${tab === 'match' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
          <Activity size={16} /> {t('common.match')}
        </button>
        <button onClick={() => setTab('stats')} className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${tab === 'stats' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
          <BarChart3 size={16} /> {t('common.stats')}
        </button>
      </nav>

      <main className="flex-1 overflow-auto p-4 max-w-2xl mx-auto w-full">
        {tab === 'match' ? (
          <div className="space-y-4">
            <SetHistory completedSets={completedSets} currentSetNumber={currentSetNumber} setsScore={setsScore} teamNames={teamNames} isFinished={isFinished} sport={sport} />
            <PlayerRoster players={players} onSetPlayers={setPlayers} teamName={teamNames.blue} sport={sport} userId={user?.id} readOnly={isFinished} />
            <ScoreBoard
              score={score} points={points} selectedTeam={selectedTeam} selectedPointType={selectedPointType} selectedAction={selectedAction}
              currentSetNumber={currentSetNumber} teamNames={teamNames} sidesSwapped={sidesSwapped} chronoRunning={chronoRunning} chronoSeconds={chronoSeconds}
              servingTeam={servingTeam} sport={sport} metadata={metadata}
              onSelectAction={selectAction} onCancelSelection={cancelSelection} onUndo={undo} onEndSet={endSet} onReset={resetMatch}
              onSwitchSides={switchSides} onStartChrono={startChrono} onPauseChrono={pauseChrono} onSetTeamNames={setTeamNames}
              canUndo={points.length > 0} isFinished={isFinished} waitingForNewSet={waitingForNewSet} onStartNewSet={startNewSet}
            />
            {metadata?.hasCourt !== false && (
              <VolleyballCourt points={points} selectedTeam={selectedTeam} selectedAction={selectedAction} selectedPointType={selectedPointType} sidesSwapped={sidesSwapped} teamNames={teamNames} onCourtClick={addPoint} />
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <AiAnalysis points={allPoints} completedSets={completedSets} currentSetPoints={points} teamNames={teamNames} players={players} sport={sport} isLoggedIn={!!user} onLoginRequired={() => setShowAuthForAi(true)} finished={isFinished} />
            </div>
            {metadata?.hasCourt === false ? (
              <HeatmapView points={allPoints} completedSets={completedSets} currentSetPoints={points} currentSetNumber={currentSetNumber} stats={stats} teamNames={teamNames} players={players} sport={sport} matchId={matchId} isLoggedIn={!!user} hasCourt={false} />
            ) : (
              <HeatmapView points={allPoints} completedSets={completedSets} currentSetPoints={points} currentSetNumber={currentSetNumber} stats={stats} teamNames={teamNames} players={players} sport={sport} matchId={matchId} isLoggedIn={!!user} />
            )}
          </div>
        )}

        {pendingPoint && players.length > 0 && (() => {
          if (pendingPoint.type === 'neutral') {
            return (
              <PlayerSelector players={players} prompt={t('playerSelector.whoDidAction')} onSelect={assignPlayer} onSkip={skipPlayerAssignment} sport={sport} />
            );
          }
          const showSelector = pendingPoint.type === 'scored' || (pendingPoint.team === 'red' && pendingPoint.type === 'fault');
          if (!showSelector) return null;
          const isFaultByBlue = pendingPoint.team === 'red' && (pendingPoint.type === 'fault' || pendingPoint.type === 'scored');
          return (
            <PlayerSelector players={players} prompt={isFaultByBlue ? t('playerSelector.whoFaulted') : t('playerSelector.whoScored')} onSelect={assignPlayer} onSkip={skipPlayerAssignment} sport={sport} />
          );
        })()}
      </main>

      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full border border-border space-y-3 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowHelp(false)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"><X size={18} /></button>
            <h2 className="text-lg font-bold text-foreground">{t('matchPage.helpTitle')}</h2>
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong className="text-foreground">{t('matchPage.helpVolleyP1')}</strong></p>
              <p><strong className="text-foreground">{t('matchPage.helpVolleyP2')}</strong></p>
              <p><strong className="text-foreground">{t('matchPage.helpVolleyP3')}</strong></p>
              <p><strong className="text-foreground">{t('matchPage.helpVolleyP4')}</strong></p>
              <p><strong className="text-foreground">{t('matchPage.helpVolleyP5')}</strong></p>
              <p><strong className="text-foreground">{t('matchPage.helpVolleyP6')}</strong></p>
            </div>
          </div>
        </div>
      )}

      <AuthDialog open={showAuthForAi} onOpenChange={setShowAuthForAi} message={t('auth.requiresLogin')} />
    </div>
  );
};

export default Index;
