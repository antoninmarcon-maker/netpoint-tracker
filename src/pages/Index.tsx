import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Activity, BarChart3, HelpCircle, X, ArrowLeft } from 'lucide-react';
import { useMatchState } from '@/hooks/useMatchState';
import { useTennisScore } from '@/hooks/useTennisScore';
import { ScoreBoard } from '@/components/ScoreBoard';
import { VolleyballCourt } from '@/components/VolleyballCourt';
import { BasketballCourt } from '@/components/BasketballCourt';
import { TennisCourt } from '@/components/TennisCourt';
import { PadelCourt } from '@/components/PadelCourt';
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
import type { MatchSummary } from '@/types/sports';
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

  // On mount: ensure match exists in localStorage (fetch from cloud if needed)
  useEffect(() => {
    if (!matchId) { setLoading(false); return; }

    const ensureMatchLocal = async () => {
      if (getMatch(matchId)) {
        setMatchReady(true);
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const cloudMatch = await getCloudMatchById(matchId);
        if (cloudMatch) {
          saveMatch(cloudMatch);
          setMatchReady(true);
          setLoading(false);
          return;
        }
      }
      setMatchReady(false);
      setLoading(false);
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
    addFreeThrow,
  } = matchState;

  const isBasketball = sport === 'basketball';
  const isTennisOrPadel = sport === 'tennis' || sport === 'padel';
  const matchData2 = getMatch(matchId ?? '');
  const metadata = matchData2?.metadata;
  const tennisScore = useTennisScore(isTennisOrPadel ? points : [], metadata);

  useEffect(() => {
    if (!isTennisOrPadel) return;
    if (tennisScore.setJustWon && points.length > 0 && !waitingForNewSet) {
      endSet();
    }
  }, [tennisScore.setJustWon, isTennisOrPadel, points.length, waitingForNewSet, endSet]);

  useEffect(() => {
    if (isBasketball && selectedAction === 'free_throw' && selectedTeam) {
      addFreeThrow();
    }
  }, [isBasketball, selectedAction, selectedTeam, addFreeThrow]);

  // Tennis/Padel: opponent faults are registered immediately without court click
  // All sports: service faults (service_miss, double_fault, padel_double_fault) skip court placement
  const SERVICE_FAULT_ACTIONS = ['service_miss', 'double_fault', 'padel_double_fault'];
  useEffect(() => {
    if (!selectedTeam || !selectedAction) return;
    const isAutoPoint =
      (isTennisOrPadel && matchState.selectedPointType === 'fault') ||
      SERVICE_FAULT_ACTIONS.includes(selectedAction);
    if (isAutoPoint) {
      addPoint(0.5, 0.5);
    }
  }, [isTennisOrPadel, matchState.selectedPointType, selectedTeam, selectedAction, addPoint]);

  useEffect(() => {
    if (!pendingPoint || players.length === 0) return;
    if (isBasketball) {
      const isBlueFault = pendingPoint.team === 'blue' && pendingPoint.type === 'fault';
      const isBlueScored = pendingPoint.team === 'blue' && pendingPoint.type === 'scored';
      if (!isBlueFault && !isBlueScored) {
        skipPlayerAssignment();
      }
      return;
    }
    const isBlueScored = pendingPoint.team === 'blue' && pendingPoint.type === 'scored';
    const isRedScored = pendingPoint.team === 'red' && pendingPoint.type === 'scored';
    const isRedFault = pendingPoint.team === 'red' && pendingPoint.type === 'fault';
    if (!isBlueScored && !isRedScored && !isRedFault) {
      skipPlayerAssignment();
    }
  }, [pendingPoint, players, skipPlayerAssignment, isBasketball]);

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
    cloudSaveTimerRef.current = setTimeout(() => {
      saveToCloud();
    }, 3000);
    return () => {
      if (cloudSaveTimerRef.current) clearTimeout(cloudSaveTimerRef.current);
    };
  }, [points, completedSets, players, teamNames, chronoSeconds, sidesSwapped, user, matchId, matchReady, saveToCloud]);

  useEffect(() => {
    return () => {
      if (user && matchId) {
        const match = getMatch(matchId);
        if (match) {
          saveCloudMatch(user.id, match).catch(() => {});
        }
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
  const sportIcon = sport === 'basketball' ? '🏀' : sport === 'tennis' ? '🎾' : sport === 'padel' ? '🏓' : '🏐';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-background px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] border-b border-border flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="p-1.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-black text-foreground tracking-tight text-center">
          {sportIcon} My Volley
        </h1>
        {tab === 'match' ? (
          <button
            onClick={() => setShowHelp(true)}
            className="p-1.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <HelpCircle size={18} />
          </button>
        ) : <div className="w-[30px]" />}
      </header>

      <nav className="sticky top-[49px] z-40 bg-background flex border-b border-border">
        <button
          onClick={() => setTab('match')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${
            tab === 'match' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
          }`}
        >
          <Activity size={16} /> {t('common.match')}
        </button>
        <button
          onClick={() => setTab('stats')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${
            tab === 'stats' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
          }`}
        >
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
            />
            <PlayerRoster
              players={players}
              onSetPlayers={setPlayers}
              teamName={teamNames.blue}
              sport={sport}
              userId={user?.id}
              readOnly={isFinished}
            />
            <ScoreBoard
              score={score}
              points={points}
              selectedTeam={selectedTeam}
              selectedAction={selectedAction}
              currentSetNumber={currentSetNumber}
              teamNames={teamNames}
              sidesSwapped={sidesSwapped}
              chronoRunning={chronoRunning}
              chronoSeconds={chronoSeconds}
              servingTeam={servingTeam}
              sport={sport}
              metadata={metadata}
              onSelectAction={selectAction}
              onCancelSelection={cancelSelection}
              onUndo={undo}
              onEndSet={endSet}
              onReset={resetMatch}
              onSwitchSides={switchSides}
              onStartChrono={startChrono}
              onPauseChrono={pauseChrono}
              onSetTeamNames={setTeamNames}
              canUndo={points.length > 0}
              isFinished={isFinished}
              waitingForNewSet={waitingForNewSet}
              onStartNewSet={startNewSet}
            />
            {sport === 'basketball' ? (
              <BasketballCourt points={points} selectedTeam={selectedTeam} selectedAction={selectedAction} selectedPointType={selectedPointType} sidesSwapped={sidesSwapped} teamNames={teamNames} onCourtClick={addPoint} />
            ) : sport === 'tennis' ? (
              <TennisCourt points={points} selectedTeam={selectedTeam} selectedAction={selectedAction} selectedPointType={selectedPointType} sidesSwapped={sidesSwapped} teamNames={teamNames} onCourtClick={addPoint} />
            ) : sport === 'padel' ? (
              <PadelCourt points={points} selectedTeam={selectedTeam} selectedAction={selectedAction} selectedPointType={selectedPointType} sidesSwapped={sidesSwapped} teamNames={teamNames} onCourtClick={addPoint} />
            ) : (
              <VolleyballCourt points={points} selectedTeam={selectedTeam} selectedAction={selectedAction} selectedPointType={selectedPointType} sidesSwapped={sidesSwapped} teamNames={teamNames} onCourtClick={addPoint} />
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <AiAnalysis
                points={allPoints}
                completedSets={completedSets}
                currentSetPoints={points}
                teamNames={teamNames}
                players={players}
                sport={sport}
                isLoggedIn={!!user}
                onLoginRequired={() => setShowAuthForAi(true)}
                finished={isFinished}
              />
            </div>
            <HeatmapView points={allPoints} completedSets={completedSets} currentSetPoints={points} currentSetNumber={currentSetNumber} stats={stats} teamNames={teamNames} players={players} sport={sport} matchId={matchId} isLoggedIn={!!user} />
          </div>
        )}

        {pendingPoint && players.length > 0 && (() => {
          if (isBasketball) {
            const isBlueFault = pendingPoint.team === 'blue' && pendingPoint.type === 'fault';
            const isBlueScored = pendingPoint.team === 'blue' && pendingPoint.type === 'scored';
            if (!isBlueFault && !isBlueScored) return null;
            return (
              <PlayerSelector
                players={players}
                prompt={isBlueFault ? t('playerSelector.whoFaulted') : t('playerSelector.whoScored')}
                onSelect={assignPlayer}
                onSkip={skipPlayerAssignment}
              />
            );
          }
          const showSelector = pendingPoint.type === 'scored' || (pendingPoint.team === 'red' && pendingPoint.type === 'fault');
          if (!showSelector) return null;
          const isFaultByBlue = pendingPoint.team === 'red' && (pendingPoint.type === 'fault' || pendingPoint.type === 'scored');
          return (
            <PlayerSelector
              players={players}
              prompt={isFaultByBlue ? t('playerSelector.whoFaulted') : t('playerSelector.whoScored')}
              onSelect={assignPlayer}
              onSkip={skipPlayerAssignment}
            />
          );
        })()}

      </main>

      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full border border-border space-y-3 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowHelp(false)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
              <X size={18} />
            </button>
            <h2 className="text-lg font-bold text-foreground">{t('matchPage.helpTitle')}</h2>
            <div className="text-sm text-muted-foreground space-y-2">
              {isBasketball ? (
                <>
                  <p><strong className="text-foreground">{t('matchPage.helpBasketP1')}</strong></p>
                  <p><strong className="text-foreground">{t('matchPage.helpBasketP2')}</strong></p>
                  <p><strong className="text-foreground">{t('matchPage.helpBasketP3')}</strong></p>
                  <p><strong className="text-foreground">{t('matchPage.helpBasketP4')}</strong></p>
                  <p><strong className="text-foreground">{t('matchPage.helpBasketP5')}</strong></p>
                </>
              ) : isTennisOrPadel ? (
                <>
                  <p><strong className="text-foreground">{t('matchPage.helpTennisP1')}</strong></p>
                  <p><strong className="text-foreground">{t(sport === 'padel' ? 'matchPage.helpTennisP2_padel' : 'matchPage.helpTennisP2_tennis')}</strong></p>
                  <p><strong className="text-foreground">{t('matchPage.helpTennisP3')}</strong></p>
                  <p><strong className="text-foreground">{t(sport === 'padel' ? 'matchPage.helpTennisP4_padel' : 'matchPage.helpTennisP4')}</strong></p>
                  <p><strong className="text-foreground">{t('matchPage.helpTennisP5')}</strong></p>
                </>
              ) : (
                <>
                  <p><strong className="text-foreground">{t('matchPage.helpVolleyP1')}</strong></p>
                  <p><strong className="text-foreground">{t('matchPage.helpVolleyP2')}</strong></p>
                  <p><strong className="text-foreground">{t('matchPage.helpVolleyP3')}</strong></p>
                  <p><strong className="text-foreground">{t('matchPage.helpVolleyP4')}</strong></p>
                  <p><strong className="text-foreground">{t('matchPage.helpVolleyP5')}</strong></p>
                  <p><strong className="text-foreground">{t('matchPage.helpVolleyP6')}</strong></p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <AuthDialog
        open={showAuthForAi}
        onOpenChange={setShowAuthForAi}
        message={t('auth.requiresLogin')}
      />
    </div>
  );
};

export default Index;
