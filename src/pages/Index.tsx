import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Activity, BarChart3, HelpCircle, X, ArrowLeft, Check } from 'lucide-react';
import { useMatchState } from '@/hooks/useMatchState';
import { getActionRequirements } from '@/lib/matchRules';
import { ScoreBoard } from '@/components/ScoreBoard';
import { VolleyballCourt } from '@/components/VolleyballCourt';
import { HeatmapView } from '@/components/HeatmapView';
import { SetHistory } from '@/components/SetHistory';
import { PlayerRoster } from '@/components/PlayerRoster';
import { PlayerSelector } from '@/components/PlayerSelector';
import { PlayByPlayNavigator } from '@/components/PlayByPlayNavigator';
import { AiAnalysis } from '@/components/AiAnalysis';
import { AuthDialog } from '@/components/AuthDialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getMatch, saveMatch } from '@/lib/matchStorage';
import { getCloudMatchById, saveCloudMatch } from '@/lib/cloudStorage';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { MatchSummary, Player, RallyAction, Point } from '@/types/sports';
import { useTranslation } from 'react-i18next';

type Tab = 'match' | 'stats';

const Index = () => {
  const { t } = useTranslation();
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const initialTab = searchParams.get('tab') === 'stats' ? 'stats' : 'match';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [showHelp, setShowHelp] = useState(false);
  const [showRatings, setShowRatings] = useState(true);
  
  const [user, setUser] = useState<User | null>(null);
  const [showAuthForAi, setShowAuthForAi] = useState(false);
  const [loading, setLoading] = useState(true);
  const [matchReady, setMatchReady] = useState(false);

  // --- Play-by-Play Visualization states ---
  const [viewingPointIndex, setViewingPointIndex] = useState<number | null>(null);
  const [viewingActionIndex, setViewingActionIndex] = useState<number>(0);
  const [cumulativeMode, setCumulativeMode] = useState(true);

  // --- Replay mode (finished matches) ---
  const [replaySetIndex, setReplaySetIndex] = useState<number | null>(null);

  // Performance mode: show player selector BEFORE court click
  const [awaitingPlayerBeforeCourt, setAwaitingPlayerBeforeCourt] = useState(false);

  // Performance mode: show rating selector AFTER player selection and BEFORE court click
  const [awaitingRating, setAwaitingRating] = useState(false);

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
    isPerformanceMode, currentRallyActions, rallyInProgress, directionOrigin, directionDest, pendingDirectionAction, directionDestSet, canUndo,
    preSelectedPlayerId, setPreSelectedPlayerId, preSelectedRating, setPreSelectedRating, pendingActionMeta,
    setTeamNames, setPlayers, selectAction, cancelSelection, addPoint, confirmDirectionAction,
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
      setViewingPointIndex(null); // overview
      setViewingActionIndex(0);
    }
  }, [isFinished, completedSets.length, replaySetIndex]);

  // --- Replay set points (all points for court display) ---
  const replaySetAllPoints = useMemo(() => {
    if (!isFinished || replaySetIndex === null || !completedSets[replaySetIndex]) return [];
    return completedSets[replaySetIndex].points;
  }, [isFinished, replaySetIndex, completedSets]);

  // --- Replay navigable points (only scored/fault, with reconstructed rallyActions) ---
  const replayNavPoints = useMemo(() => {
    const allPts = replaySetAllPoints;
    const result: Point[] = [];
    let pendingNeutrals: Point[] = [];

    for (const p of allPts) {
      if (p.type === 'neutral') {
        pendingNeutrals.push(p);
      } else {
        // scored or fault — check if rallyActions already exist
        if (p.rallyActions && p.rallyActions.length > 0) {
          result.push(p);
        } else {
          // Reconstruct rallyActions from pending neutrals + this concluding point
          const reconstructedRally: RallyAction[] = [
            ...pendingNeutrals.map(n => ({
              id: n.id,
              team: n.team,
              type: n.type,
              action: n.action,
              x: n.x,
              y: n.y,
              playerId: n.playerId,
              timestamp: n.timestamp,
              customActionLabel: n.customActionLabel,
              sigil: n.sigil,
              showOnCourt: n.showOnCourt,
            } as RallyAction)),
            {
              id: p.id,
              team: p.team,
              type: p.type,
              action: p.action,
              x: p.x,
              y: p.y,
              playerId: p.playerId,
              timestamp: p.timestamp,
              customActionLabel: p.customActionLabel,
              sigil: p.sigil,
              showOnCourt: p.showOnCourt,
            } as RallyAction,
          ];
          result.push({
            ...p,
            rallyActions: reconstructedRally.length > 1 ? reconstructedRally : undefined,
          });
        }
        pendingNeutrals = [];
      }
    }
    return result;
  }, [replaySetAllPoints]);

  // --- Visualization helpers ---
  const isViewingMode = viewingPointIndex !== null;

  const handleSelectViewPoint = useCallback((index: number) => {
    setViewingPointIndex(index);
    setViewingActionIndex(0);
  }, []);

  const handleChangePoint = useCallback((index: number | null) => {
    setViewingPointIndex(index);
    setViewingActionIndex(0);
  }, []);

  const handleChangeAction = useCallback((index: number) => {
    setViewingActionIndex(index);
  }, []);

  const handleBackToLive = useCallback(() => {
    setViewingActionIndex(0);
    setViewingPointIndex(null);
    setReplaySetIndex(null);
  }, []);

  const handleSelectReplaySet = useCallback((index: number) => {
    setReplaySetIndex(index);
    setViewingPointIndex(null); // overview
    setViewingActionIndex(0);
  }, []);

  // Derive the viewing action/point for the court
  const viewingCourtData = useMemo(() => {
    if (viewingPointIndex === null) return { actions: [], point: null };
    const pts = isFinished ? replayNavPoints : allPoints;
    const point = pts[viewingPointIndex];
    if (!point) return { actions: [], point: null };

    const rallyActions = point.rallyActions ?? [];
    if (rallyActions.length > 0) {
      if (cumulativeMode) {
        return { actions: rallyActions.slice(0, viewingActionIndex + 1), point: null };
      } else {
        const action = rallyActions[viewingActionIndex] ?? null;
        return { actions: action ? [action] : [], point: null };
      }
    }
    return { actions: [], point };
  }, [viewingPointIndex, viewingActionIndex, allPoints, replayNavPoints, isFinished, cumulativeMode]);

  const getPlayerName = useCallback((id: string) => {
    const p = players.find(p => p.id === id);
    return p ? p.name : `#${id.slice(0, 4)}`;
  }, [players]);

  // Points to show on court in overview mode (all points of the set)
  const courtPoints = useMemo(() => {
    if (isFinished) {
      return replaySetAllPoints;
    }
    return points;
  }, [isFinished, replaySetAllPoints, points]);

  useEffect(() => {
    if (!selectedTeam || !selectedAction) {
      setAwaitingPlayerBeforeCourt(false);
      setAwaitingRating(false);
      return;
    }

    const reqs = getActionRequirements(
      players.length > 0,
      selectedTeam,
      selectedPointType!,
      selectedAction,
      pendingActionMeta,
      metadata,
      isPerformanceMode
    );

    // If action needs player AND court, show player selector first (performance mode)
    if (isPerformanceMode && reqs.needsAssignToPlayer && reqs.needsCourtPlacement && !preSelectedPlayerId) {
      setAwaitingPlayerBeforeCourt(true);
      return;
    }

    // If action needs rating, show rating selector (both modes)
    if (reqs.needsRating && !preSelectedRating) {
      setAwaitingRating(true);
      return;
    }

    setAwaitingRating(false);
    setAwaitingPlayerBeforeCourt(false);

    if (reqs.isAutoPoint) {
      addPoint(0.5, 0.5);
    }
  }, [matchState.selectedPointType, selectedTeam, selectedAction, addPoint, isPerformanceMode, players.length, preSelectedPlayerId, preSelectedRating, pendingActionMeta, metadata]);

  // Player assignment logic: The decision to show the popup is now fully handled in useMatchState
  // If pendingPoint is set, it means the popup SHOULD be shown. We just need a failsafe to skip
  // if players were removed in the background, though players.length is also checked in useMatchState.
  useEffect(() => {
    if (pendingPoint && players.length === 0) {
      skipPlayerAssignment();
    }
  }, [pendingPoint, players.length, skipPlayerAssignment]);

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
    saveCloudMatch(user.id, match).catch(err => { if (import.meta.env.DEV) console.error('[CloudSync] save failed:', err); }
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
        if (match) { saveCloudMatch(user.id, match).catch(() => { }); }
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
  const isViewingOldSet = !isFinished && replaySetIndex !== null;
  const isReplayModeActive = isFinished || isViewingOldSet;
  const isInReplayView = isReplayModeActive && (viewingPointIndex !== null || isViewingOldSet);
  const isOverview = viewingPointIndex === null;

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
              selectedSetIndex={replaySetIndex ?? undefined}
              onSelectSet={handleSelectReplaySet}
            />
            {!isFinished && (
              <PlayerRoster players={players} onSetPlayers={setPlayers} teamName={teamNames.blue} sport={sport} userId={user?.id} readOnly={isReplayModeActive} />
            )}
            <ScoreBoard
              score={replaySetIndex !== null && completedSets[replaySetIndex]
                ? completedSets[replaySetIndex].score
                : score}
              points={isReplayModeActive ? replaySetAllPoints : points}
              selectedTeam={selectedTeam} selectedPointType={selectedPointType} selectedAction={selectedAction}
              currentSetNumber={replaySetIndex !== null && completedSets[replaySetIndex]
                ? completedSets[replaySetIndex].number
                : currentSetNumber}
              teamNames={teamNames} sidesSwapped={sidesSwapped} chronoRunning={chronoRunning} chronoSeconds={chronoSeconds}
              servingTeam={servingTeam} sport={sport} metadata={metadata}
              onSelectAction={selectAction} onCancelSelection={cancelSelection} onUndo={undo} onEndSet={endSet} onFinishMatch={matchState.finishMatch} onReset={resetMatch}
              onSwitchSides={switchSides} onStartChrono={startChrono} onPauseChrono={pauseChrono} onSetTeamNames={setTeamNames}
              canUndo={canUndo} isFinished={isReplayModeActive} waitingForNewSet={waitingForNewSet} lastEndedSetScore={lastEndedSetScore} onStartNewSet={startNewSet}
              rallyInProgress={rallyInProgress} rallyActionCount={currentRallyActions.length}
              awaitingRating={awaitingRating}
              onSelectRating={setPreSelectedRating}
              pendingActionMeta={pendingActionMeta}
            />

            {/* Direction mode indicator (live only) */}
            {!isFinished && pendingDirectionAction && directionOrigin && (
              <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-accent/20 border border-accent">
                <span className="text-xs font-bold text-accent-foreground flex-1">🎯 {t('scoreboard.confirmTrajectory')}</span>
                <div className="flex gap-2">
                  <button onClick={cancelSelection} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground text-xs font-semibold hover:bg-secondary/80">
                    <X size={14} /> {t('common.cancel', 'Annuler')}
                  </button>
                  <button onClick={confirmDirectionAction} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90">
                    <Check size={14} /> {t('common.confirm', 'Valider')}
                  </button>
                </div>
              </div>
            )}

            {/* Play-by-Play Navigator: shown for selected past sets (finished or not) */}
            {replaySetIndex !== null && replayNavPoints.length > 0 && (
              <PlayByPlayNavigator
                points={replayNavPoints}
                viewingPointIndex={viewingPointIndex}
                viewingActionIndex={viewingActionIndex}
                onChangePoint={handleChangePoint}
                onChangeAction={handleChangeAction}
                onBackToLive={isFinished ? undefined : handleBackToLive}
                isReplayMode={isFinished}
                isPerformanceMode={isPerformanceMode}
                cumulativeMode={cumulativeMode}
                onToggleCumulative={setCumulativeMode}
                getPlayerName={getPlayerName}
              />
            )}
            {!isReplayModeActive && viewingPointIndex !== null && (
              <PlayByPlayNavigator
                points={allPoints}
                viewingPointIndex={viewingPointIndex}
                viewingActionIndex={viewingActionIndex}
                onChangePoint={handleChangePoint}
                onChangeAction={handleChangeAction}
                onBackToLive={handleBackToLive}
                isPerformanceMode={isPerformanceMode}
                cumulativeMode={cumulativeMode}
                onToggleCumulative={setCumulativeMode}
                getPlayerName={getPlayerName}
              />
            )}

            {metadata?.hasCourt !== false && (() => {
              const activeCourtActions = isPerformanceMode
                ? currentRallyActions
                : currentRallyActions;

              return (
                <VolleyballCourt
                  points={isReplayModeActive && isOverview ? replaySetAllPoints : (isReplayModeActive ? [] : courtPoints)}
                  selectedTeam={isInReplayView ? null : (pendingDirectionAction ? null : selectedTeam)}
                  selectedAction={isInReplayView ? null : (pendingDirectionAction ? null : selectedAction)}
                  selectedPointType={isInReplayView ? null : (pendingDirectionAction ? null : selectedPointType)}
                  sidesSwapped={isReplayModeActive && replaySetIndex !== null ? (replaySetIndex % 2 !== 0) : sidesSwapped}
                  teamNames={teamNames}
                  onCourtClick={addPoint}
                  directionOrigin={isInReplayView ? null : directionOrigin}
                  directionDest={isInReplayView ? null : directionDest}
                  pendingDirectionAction={isInReplayView ? false : !!pendingDirectionAction}
                  isViewingMode={isInReplayView}
                  isPerformanceMode={isPerformanceMode}
                  viewingActions={viewingCourtData.actions}
                  activeRallyActions={activeCourtActions}
                  viewingPoint={viewingCourtData.point}
                  playerAliases={playerAliases}
                  pendingHasDirection={pendingActionMeta?.hasDirection}
                  awaitingRating={awaitingRating}
                />
              );
            })()}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Switch id="show-ratings" checked={showRatings} onCheckedChange={setShowRatings} />
                <Label htmlFor="show-ratings" className="text-sm font-semibold text-muted-foreground cursor-pointer flex items-center gap-1.5">
                  Notations
                  <span className="inline-flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-green-500" /><span className="w-2 h-2 rounded-full bg-orange-500" /><span className="w-2 h-2 rounded-full bg-destructive" /></span>
                </Label>
              </div>
              <AiAnalysis points={allPoints} completedSets={completedSets} currentSetPoints={points} teamNames={teamNames} players={players} sport={sport} isLoggedIn={!!user} onLoginRequired={() => setShowAuthForAi(true)} finished={isFinished} matchId={matchId} />
            </div>
            {metadata?.hasCourt === false ? (
              <HeatmapView points={allPoints} completedSets={completedSets} currentSetPoints={points} currentSetNumber={currentSetNumber} stats={stats} teamNames={teamNames} players={players} sport={sport} matchId={matchId} isLoggedIn={!!user} hasCourt={false} showRatings={showRatings} />
            ) : (
              <HeatmapView points={allPoints} completedSets={completedSets} currentSetPoints={points} currentSetNumber={currentSetNumber} stats={stats} teamNames={teamNames} players={players} sport={sport} matchId={matchId} isLoggedIn={!!user} onSelectPoint={handleSelectViewPoint} viewingPointIndex={viewingPointIndex} showRatings={showRatings} />
            )}
          </div>
        )}

        {/* Pre-court player selector (Performance mode: Action→Player→Court flow) */}
        {!isReplayModeActive && awaitingPlayerBeforeCourt && selectedTeam && selectedAction && players.length > 0 && (
          <PlayerSelector
            players={players}
            prompt={t('playerSelector.whoDidAction')}
            team={selectedTeam}
            teamName={teamNames[selectedTeam]}
            onSelect={(playerId) => {
              setPreSelectedPlayerId(playerId);
              setAwaitingPlayerBeforeCourt(false);
              // Now the court click banner will show (selectedTeam is still set)
            }}
            onSkip={() => {
              setPreSelectedPlayerId(null);
              setAwaitingPlayerBeforeCourt(false);
            }}
            sport={sport}
          />
        )}

        {/* Post-court player selector (Standard mode or performance mode without court) */}
        {!isReplayModeActive && !awaitingPlayerBeforeCourt && pendingPoint && players.length > 0 && (() => {
          if (pendingPoint.type === 'neutral') {
            return (
              <PlayerSelector players={players} prompt={t('playerSelector.whoDidAction')} onSelect={assignPlayer} onSkip={skipPlayerAssignment} sport={sport} team={pendingPoint.team} teamName={teamNames[pendingPoint.team]} />
            );
          }

          // Logic: 
          // If Blue scores (type=scored), ask who scored for Blue.
          // If Red faults (type=fault), point goes to Blue, but we ask who faulted for Red.
          // In pendingPoint, 'team' is always the team that "owns" the action.
          const prompt = pendingPoint.type === 'fault' ? t('playerSelector.whoFaulted') : t('playerSelector.whoScored');
          const popupTeam = pendingPoint.team;

          return (
            <PlayerSelector players={players} prompt={prompt} onSelect={assignPlayer} onSkip={skipPlayerAssignment} sport={sport} team={popupTeam} teamName={teamNames[popupTeam]} />
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
