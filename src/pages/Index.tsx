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
import { PlayByPlayNavigator } from '@/components/PlayByPlayNavigator';
import { AiAnalysis } from '@/components/AiAnalysis';
import { AuthDialog } from '@/components/AuthDialog';
import { getMatch, saveMatch } from '@/lib/matchStorage';
import { getCloudMatchById, saveCloudMatch } from '@/lib/cloudStorage';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { MatchSummary, Player, RallyAction } from '@/types/sports';
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

  // --- Play-by-Play Visualization states ---
  const [viewingPointIndex, setViewingPointIndex] = useState<number | null>(null);
  const [viewingActionIndex, setViewingActionIndex] = useState<number | null>(null);

  // --- Replay mode (finished matches) ---
  const [replaySetIndex, setReplaySetIndex] = useState<number | null>(null);

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
    isPerformanceMode, currentRallyActions, rallyInProgress, directionOrigin, pendingDirectionAction, canUndo,
    setTeamNames, setPlayers, selectAction, cancelSelection, addPoint,
    assignPlayer, skipPlayerAssignment,
    undo, endSet, startNewSet, waitingForNewSet, lastEndedSetScore, resetMatch, switchSides, startChrono, pauseChrono,
  } = matchState;

  const matchData2 = getMatch(matchId ?? '');
  const metadata = matchData2?.metadata;
  const playerAliases = metadata?.playerAliases ?? {};
  const isFinished = matchData2?.finished ?? false;

  // --- Initialize replay mode for finished matches ---
  useEffect(() => {
    if (isFinished && completedSets.length > 0 && replaySetIndex === null) {
      setReplaySetIndex(completedSets.length - 1);
      setViewingPointIndex(-1); // overview
      setViewingActionIndex(0);
    }
  }, [isFinished, completedSets.length, replaySetIndex]);

  // --- Replay set points ---
  const replaySetPoints = useMemo(() => {
    if (!isFinished || replaySetIndex === null || !completedSets[replaySetIndex]) return [];
    return completedSets[replaySetIndex].points;
  }, [isFinished, replaySetIndex, completedSets]);

  // --- Visualization helpers ---
  const isViewingMode = viewingPointIndex !== null;

  const handleSelectViewPoint = useCallback((index: number) => {
    setViewingPointIndex(index);
    setViewingActionIndex(0);
  }, []);

  const handleChangePoint = useCallback((index: number) => {
    const pts = isFinished ? replaySetPoints : allPoints;
    if (index < -1 || index >= pts.length) return;
    setViewingPointIndex(index);
    setViewingActionIndex(0);
  }, [allPoints, replaySetPoints, isFinished]);

  const handleChangeAction = useCallback((index: number) => {
    setViewingActionIndex(index);
  }, []);

  const handleBackToLive = useCallback(() => {
    setViewingPointIndex(null);
    setViewingActionIndex(null);
  }, []);

  const handleSelectReplaySet = useCallback((index: number) => {
    setReplaySetIndex(index);
    setViewingPointIndex(-1); // overview
    setViewingActionIndex(0);
  }, []);

  // Derive the viewing action/point for the court
  const viewingCourtData = useMemo(() => {
    if (viewingPointIndex === null || viewingPointIndex === -1) return { action: null, point: null };
    const pts = isFinished ? replaySetPoints : allPoints;
    const point = pts[viewingPointIndex];
    if (!point) return { action: null, point: null };

    const rallyActions = point.rallyActions ?? [];
    if (isPerformanceMode && rallyActions.length > 0 && viewingActionIndex !== null) {
      const action = rallyActions[viewingActionIndex] ?? null;
      return { action, point: null };
    }
    return { action: null, point };
  }, [viewingPointIndex, viewingActionIndex, allPoints, replaySetPoints, isFinished, isPerformanceMode]);

  // Points to show on court in overview mode (all points of the set)
  const courtPoints = useMemo(() => {
    if (isFinished) {
      if (viewingPointIndex === -1) return replaySetPoints; // overview: show all
      return replaySetPoints; // still pass all for context but viewing mode will show single
    }
    return points;
  }, [isFinished, viewingPointIndex, replaySetPoints, points]);

  // Auto-point for service faults or when court is disabled or placeOnCourt=false
  const SERVICE_FAULT_ACTIONS = ['service_miss', 'gameplay_fault', 'opponent_fault', 'timeout'];
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
    if ((window as any).__pendingCustomAssignToPlayer === false) {
      delete (window as any).__pendingCustomAssignToPlayer;
      skipPlayerAssignment();
      return;
    }
    if ((window as any).__pendingCustomAssignToPlayer !== undefined) {
      delete (window as any).__pendingCustomAssignToPlayer;
    }
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

  // Exit viewing mode when new points are added (live mode only)
  useEffect(() => {
    if (!isFinished && isViewingMode && selectedTeam) {
      handleBackToLive();
    }
  }, [selectedTeam, isFinished]);

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

  // Determine if we're in replay viewing mode (overview or specific point)
  const isInReplayView = isFinished && viewingPointIndex !== null;
  const isOverview = viewingPointIndex === -1;

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
          <Activity size={16} /> {isFinished ? 'Replay' : t('common.match')}
        </button>
        <button onClick={() => setTab('stats')} className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${tab === 'stats' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
          <BarChart3 size={16} /> {t('common.stats')}
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
              isFinished={isFinished}
              sport={sport}
              selectedSetIndex={isFinished ? replaySetIndex : undefined}
              onSelectSet={isFinished ? handleSelectReplaySet : undefined}
            />
            {!isFinished && (
              <PlayerRoster players={players} onSetPlayers={setPlayers} teamName={teamNames.blue} sport={sport} userId={user?.id} readOnly={isFinished} />
            )}
            <ScoreBoard
              score={isFinished && replaySetIndex !== null && completedSets[replaySetIndex]
                ? completedSets[replaySetIndex].score
                : score}
              points={isFinished ? replaySetPoints : points}
              selectedTeam={selectedTeam} selectedPointType={selectedPointType} selectedAction={selectedAction}
              currentSetNumber={isFinished && replaySetIndex !== null && completedSets[replaySetIndex]
                ? completedSets[replaySetIndex].number
                : currentSetNumber}
              teamNames={teamNames} sidesSwapped={sidesSwapped} chronoRunning={chronoRunning} chronoSeconds={chronoSeconds}
              servingTeam={servingTeam} sport={sport} metadata={metadata}
              onSelectAction={selectAction} onCancelSelection={cancelSelection} onUndo={undo} onEndSet={endSet} onFinishMatch={matchState.finishMatch} onReset={resetMatch}
              onSwitchSides={switchSides} onStartChrono={startChrono} onPauseChrono={pauseChrono} onSetTeamNames={setTeamNames}
              canUndo={canUndo} isFinished={isFinished} waitingForNewSet={waitingForNewSet} lastEndedSetScore={lastEndedSetScore} onStartNewSet={startNewSet}
              rallyInProgress={rallyInProgress} rallyActionCount={currentRallyActions.length}
            />

            {/* Direction mode indicator (live only) */}
            {!isFinished && pendingDirectionAction && directionOrigin && (
              <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-accent/50 border border-accent animate-pulse">
                <span className="text-xs font-bold text-accent-foreground">🎯 {t('scoreboard.touchCourtDestination')}</span>
                <button onClick={cancelSelection} className="p-1 rounded-md text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Play-by-Play Navigator: shown in replay mode OR live viewing mode */}
            {isFinished && replaySetPoints.length > 0 && (
              <PlayByPlayNavigator
                points={replaySetPoints}
                viewingPointIndex={viewingPointIndex ?? -1}
                viewingActionIndex={viewingActionIndex ?? 0}
                onChangePoint={handleChangePoint}
                onChangeAction={handleChangeAction}
                isReplayMode={true}
                isPerformanceMode={isPerformanceMode}
              />
            )}
            {!isFinished && isViewingMode && (
              <PlayByPlayNavigator
                points={allPoints}
                viewingPointIndex={viewingPointIndex!}
                viewingActionIndex={viewingActionIndex ?? 0}
                onChangePoint={handleChangePoint}
                onChangeAction={handleChangeAction}
                onBackToLive={handleBackToLive}
                isPerformanceMode={isPerformanceMode}
              />
            )}

            {metadata?.hasCourt !== false && (
              <VolleyballCourt
                points={isFinished && isOverview ? replaySetPoints : (isFinished ? [] : courtPoints)}
                selectedTeam={isInReplayView ? null : (pendingDirectionAction ? null : selectedTeam)}
                selectedAction={isInReplayView ? null : (pendingDirectionAction ? null : selectedAction)}
                selectedPointType={isInReplayView ? null : (pendingDirectionAction ? null : selectedPointType)}
                sidesSwapped={sidesSwapped}
                teamNames={teamNames}
                onCourtClick={addPoint}
                directionOrigin={isInReplayView ? null : directionOrigin}
                pendingDirectionAction={isInReplayView ? false : !!pendingDirectionAction}
                isViewingMode={isInReplayView && !isOverview}
                viewingAction={viewingCourtData.action}
                viewingPoint={viewingCourtData.point}
                playerAliases={playerAliases}
              />
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <AiAnalysis points={allPoints} completedSets={completedSets} currentSetPoints={points} teamNames={teamNames} players={players} sport={sport} isLoggedIn={!!user} onLoginRequired={() => setShowAuthForAi(true)} finished={isFinished} matchId={matchId} />
            </div>
            {metadata?.hasCourt === false ? (
              <HeatmapView points={allPoints} completedSets={completedSets} currentSetPoints={points} currentSetNumber={currentSetNumber} stats={stats} teamNames={teamNames} players={players} sport={sport} matchId={matchId} isLoggedIn={!!user} hasCourt={false} />
            ) : (
              <HeatmapView points={allPoints} completedSets={completedSets} currentSetPoints={points} currentSetNumber={currentSetNumber} stats={stats} teamNames={teamNames} players={players} sport={sport} matchId={matchId} isLoggedIn={!!user} onSelectPoint={handleSelectViewPoint} viewingPointIndex={viewingPointIndex} />
            )}
          </div>
        )}

        {!isFinished && pendingPoint && players.length > 0 && (() => {
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
