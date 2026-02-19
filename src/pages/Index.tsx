import { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Activity, BarChart3, HelpCircle, X, ArrowLeft } from 'lucide-react';
import { useMatchState } from '@/hooks/useMatchState';
import { ScoreBoard } from '@/components/ScoreBoard';
import { VolleyballCourt } from '@/components/VolleyballCourt';
import { BasketballCourt } from '@/components/BasketballCourt';
import { HeatmapView } from '@/components/HeatmapView';
import { SetHistory } from '@/components/SetHistory';
import { PlayerRoster } from '@/components/PlayerRoster';
import { PlayerSelector } from '@/components/PlayerSelector';
import { AiAnalysis } from '@/components/AiAnalysis';
import { AuthDialog } from '@/components/AuthDialog';
import { getMatch, saveMatch } from '@/lib/matchStorage';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { MatchSummary } from '@/types/sports';

type Tab = 'match' | 'stats';

const Index = () => {
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
      // Already in localStorage?
      if (getMatch(matchId)) {
        setMatchReady(true);
        setLoading(false);
        return;
      }

      // Try fetching from cloud
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from('matches')
          .select('match_data')
          .eq('id', matchId)
          .maybeSingle();
        if (data?.match_data) {
          saveMatch(data.match_data as unknown as MatchSummary);
          setMatchReady(true);
          setLoading(false);
          return;
        }
      }
      // Not found anywhere
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

  // Auto-add free throw without court placement
  useEffect(() => {
    if (isBasketball && selectedAction === 'free_throw' && selectedTeam) {
      addFreeThrow();
    }
  }, [isBasketball, selectedAction, selectedTeam, addFreeThrow]);

  // Auto-skip player assignment for non-blue-scored points
  useEffect(() => {
    if (pendingPoint && players.length > 0 && !(pendingPoint.team === 'blue' && pendingPoint.type === 'scored')) {
      skipPlayerAssignment();
    }
  }, [pendingPoint, players, skipPlayerAssignment]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Chargement du match…</div>
      </div>
    );
  }

  if (!matchId || !matchReady) {
    return <Navigate to="/" replace />;
  }

  const matchData = getMatch(matchId);
  const isFinished = matchData?.finished ?? false;
  const sportIcon = isBasketball ? '🏀' : '🏐';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 py-3 border-b border-border flex items-center justify-between">
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
              isFinished={isFinished}
              sport={sport}
            />
            <PlayerRoster
              players={players}
              onSetPlayers={setPlayers}
              teamName={teamNames.blue}
            />
            <ScoreBoard
              score={score}
              selectedTeam={selectedTeam}
              selectedAction={selectedAction}
              currentSetNumber={currentSetNumber}
              teamNames={teamNames}
              sidesSwapped={sidesSwapped}
              chronoRunning={chronoRunning}
              chronoSeconds={chronoSeconds}
              servingTeam={servingTeam}
              sport={sport}
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
            {isBasketball ? (
              <BasketballCourt
                points={points}
                selectedTeam={selectedTeam}
                selectedAction={selectedAction}
                selectedPointType={selectedPointType}
                sidesSwapped={sidesSwapped}
                teamNames={teamNames}
                onCourtClick={addPoint}
              />
            ) : (
              <VolleyballCourt
                points={points}
                selectedTeam={selectedTeam}
                selectedAction={selectedAction}
                selectedPointType={selectedPointType}
                sidesSwapped={sidesSwapped}
                teamNames={teamNames}
                onCourtClick={addPoint}
              />
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
              />
            </div>
            <HeatmapView points={allPoints} completedSets={completedSets} currentSetPoints={points} currentSetNumber={currentSetNumber} stats={stats} teamNames={teamNames} players={players} sport={sport} matchId={matchId} isLoggedIn={!!user} />
          </div>
        )}

        {/* Player assignment modal - only for blue team scored points */}
        {pendingPoint && players.length > 0 && pendingPoint.team === 'blue' && pendingPoint.type === 'scored' && (
          <PlayerSelector
            players={players}
            prompt="Quel joueur a marqué ?"
            onSelect={assignPlayer}
            onSkip={skipPlayerAssignment}
          />
        )}

      </main>

      {/* Help modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full border border-border space-y-3 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowHelp(false)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
              <X size={18} />
            </button>
            <h2 className="text-lg font-bold text-foreground">Comment ça marche ?</h2>
            <div className="text-sm text-muted-foreground space-y-2">
              {isBasketball ? (
                <>
                  <p><strong className="text-foreground">1. Appuyez sur « + »</strong> sous le score de l'équipe concernée.</p>
                  <p><strong className="text-foreground">2. Choisissez l'onglet</strong> : <em>Paniers</em> (1pt Lancer franc, 2pts Intérieur, 3pts Extérieur) ou <em>Actions négatives</em> (Tir manqué, Perte de balle, Faute commise).</p>
                  <p><strong className="text-foreground">3. Placez sur le terrain</strong> : pour les 3pts, seule la zone au-delà de l'arc est cliquable. Sélectionnez ensuite le joueur.</p>
                  <p><strong className="text-foreground">4. Quart-temps</strong> : « Fin QT » termine la période en cours.</p>
                  <p><strong className="text-foreground">5. Statistiques</strong> : onglet Stats pour voir les paniers et fautes par joueur + heatmap des tirs.</p>
                </>
              ) : (
                <>
                  <p><strong className="text-foreground">1. Appuyez sur « + »</strong> sous le score de l'équipe concernée. Une flèche animée indique l'équipe sélectionnée.</p>
                  <p><strong className="text-foreground">2. Choisissez l'onglet</strong> : <em>Points Gagnés</em> (Attaque, Ace, Block, Bidouille, Seconde main) ou <em>Fautes Adverses</em> (Out, Filet, Service loupé, Block Out).</p>
                  <p><strong className="text-foreground">3. Cliquez sur l'action</strong> puis placez-la sur le terrain (zone autorisée illuminée) et sélectionnez le joueur.</p>
                  <p><strong className="text-foreground">4. Gérez les sets</strong> : « Fin du Set » termine et inverse les côtés. Le gagnant 🏆 = le plus de sets remportés.</p>
                  <p><strong className="text-foreground">5. Statistiques</strong> : onglet Stats pour voir les points ⚡ et fautes ❌ par joueur (dépliables) + heatmap.</p>
                  <p><strong className="text-foreground">6. Exportez & Partagez</strong> : stats PNG, terrain par set, Excel, ou partagez le score via WhatsApp / Telegram / X.</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auth dialog for AI */}
      <AuthDialog
        open={showAuthForAi}
        onOpenChange={setShowAuthForAi}
        message="Cette fonctionnalité nécessite une connexion."
      />
    </div>
  );
};

export default Index;
