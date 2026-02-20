import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, History, Trash2, Eye, Play, Info, CheckCircle2, LogIn, HelpCircle, Loader2, X } from 'lucide-react';
import logoCapbreton from '@/assets/logo-capbreton.jpeg';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getAllMatches, createNewMatch, saveMatch, setActiveMatchId, deleteMatch, getMatch } from '@/lib/matchStorage';
import { syncLocalMatchesToCloud, getCloudMatches, saveCloudMatch, deleteCloudMatch, getCloudMatchById } from '@/lib/cloudStorage';
import { MatchSummary, SetData, Team, SportType } from '@/types/sports';
import { toast } from 'sonner';
import { PwaInstallBanner } from '@/components/PwaInstallBanner';
import { AuthDialog } from '@/components/AuthDialog';
import { UserMenu } from '@/components/UserMenu';
import { SavedPlayersManager } from '@/components/SavedPlayersManager';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function matchScore(match: MatchSummary) {
  const blue = match.completedSets.filter(s => s.winner === 'blue').length;
  const red = match.completedSets.filter(s => s.winner === 'red').length;
  return { blue, red };
}

function Instructions({ onClose }: { onClose?: () => void }) {
  return (
    <div className="bg-card rounded-xl p-5 border border-border space-y-3 relative">
      {onClose && (
        <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
          <X size={16} />
        </button>
      )}
      <div className="flex items-center gap-2">
        <Info size={16} className="text-primary" />
        <h3 className="text-sm font-bold text-foreground">Comment ça marche ?</h3>
      </div>
      <div className="text-sm text-muted-foreground space-y-2">
        <p><strong className="text-foreground">1. Créez un match</strong> : appuyez sur « Nouveau Match », choisissez le sport (🏐 Volley, 🏀 Basket, 🎾 Tennis ou 🏓 Padel) et nommez les équipes.</p>
        <p><strong className="text-foreground">2. Roster</strong> : ajoutez vos joueurs (numéro + nom). Ils sont sauvegardés automatiquement pour les prochains matchs.</p>
        <p><strong className="text-foreground">3. Marquez les points</strong> : « + » sous le score → choisissez l'action → placez sur le terrain → sélectionnez le joueur.</p>
        <p><strong className="text-foreground">4. Actions par sport</strong> :</p>
        <ul className="list-disc list-inside pl-2 space-y-1 text-xs">
          <li><strong>🏐 Volley</strong> : Attaque, Ace, Block, Bidouille, Seconde main · Fautes adverses : Out, Filet, Service loupé…</li>
          <li><strong>🏀 Basket</strong> : Lancer franc (1pt), Tir intérieur (2pts), Tir à 3pts · Zones adaptées sur le terrain.</li>
          <li><strong>🎾 Tennis</strong> : Ace, Coup droit/Revers gagnant, Volée, Smash · Fautes adverses : Double faute, Out long/latéral… Scoring automatique 15-30-40-Jeu avec avantage et tie-break.</li>
          <li><strong>🏓 Padel</strong> : Víbora, Bandeja, Smash, Bajada, Par 3 · Fautes adverses : Double faute, Grille, Vitre… Scoring identique au tennis avec option punto de oro.</li>
        </ul>
        <p><strong className="text-foreground">5. Périodes</strong> : « Fin du Set » / « Fin du QT » pour passer à la suite. En Tennis/Padel, le set se termine automatiquement quand un joueur gagne assez de jeux.</p>
        <p><strong className="text-foreground">6. Stats & Heatmap</strong> : onglet Statistiques pour les stats par joueur, la heatmap et l'analyse IA.</p>
        <p><strong className="text-foreground">7. Exportez</strong> : stats en PNG, terrain par set, Excel complet ou partage via un lien.</p>
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [guestDismissed, setGuestDismissed] = useState(() => sessionStorage.getItem('guestDismissed') === 'true');
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [names, setNames] = useState({ blue: '', red: '' });
  const [selectedSport, setSelectedSport] = useState<SportType>('volleyball');
  const [finishingId, setFinishingId] = useState<string | null>(null);
  const [showSavedPlayers, setShowSavedPlayers] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Load matches based on auth state
  const loadMatches = useCallback(async (currentUser: User | null) => {
    setLoadingMatches(true);
    let all: MatchSummary[];
    if (currentUser) {
      all = await getCloudMatches();
    } else {
      all = getAllMatches();
    }
    console.log('[DEBUG] loadMatches: user=', !!currentUser, 'total=', all.length, 'finished=', all.filter(m => m.finished).length, 'active=', all.filter(m => !m.finished).length);
    const active = all.filter(m => !m.finished).sort((a, b) => b.updatedAt - a.updatedAt);
    const finished = all.filter(m => m.finished).sort((a, b) => b.updatedAt - a.updatedAt);
    setMatches([...active, ...finished]);
    setLoadingMatches(false);
  }, []);

  // Load local matches immediately for guests (don't wait for Supabase)
  useEffect(() => {
    const localMatches = getAllMatches();
    if (localMatches.length > 0) {
      const active = localMatches.filter(m => !m.finished).sort((a, b) => b.updatedAt - a.updatedAt);
      const finished = localMatches.filter(m => m.finished).sort((a, b) => b.updatedAt - a.updatedAt);
      setMatches([...active, ...finished]);
      setLoadingMatches(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Listener for ongoing auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        setTimeout(async () => {
          if (!isMounted) return;
          await syncLocalMatchesToCloud(u.id);
          await loadMatches(u);
        }, 0);
      } else if (authLoaded) {
        // Only reload as guest if auth was already loaded (avoid flash on init)
        loadMatches(null);
      }
    });

    // Initial session load
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          await syncLocalMatchesToCloud(u.id);
        }
        await loadMatches(u);
      } finally {
        if (isMounted) setAuthLoaded(true);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadMatches]);

  // Show auth dialog on first visit if not logged in AND auth is loaded
  useEffect(() => {
    if (!authLoaded) return;
    if (user) {
      setShowAuth(false);
      return;
    }
    if (!guestDismissed) {
      const timer = setTimeout(() => setShowAuth(true), 500);
      return () => clearTimeout(timer);
    }
  }, [user, guestDismissed, authLoaded]);

  const handleCreate = () => {
    const match = createNewMatch({
      blue: names.blue.trim() || 'Bleue',
      red: names.red.trim() || 'Rouge',
    }, selectedSport);
    saveMatch(match);
    setActiveMatchId(match.id);
    // Fire-and-forget cloud save — don't block navigation
    if (user) {
      saveCloudMatch(user.id, match).catch(err =>
        console.error('Cloud save failed:', err)
      );
    }
    setShowNew(false);
    navigate(`/match/${match.id}`);
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    deleteMatch(id);
    if (user) {
      try {
        await deleteCloudMatch(id);
      } catch (err) {
        console.error('Cloud delete failed:', err);
      }
    }
    setDeletingId(null);
    await loadMatches(user);
  };

  const handleFinishMatch = async (id: string) => {
    try {
      let match = getMatch(id);
      // If not in localStorage, try fetching from cloud
      if (!match && user) {
        const cloudMatch = await getCloudMatchById(id);
        if (cloudMatch) {
          match = cloudMatch;
          saveMatch(cloudMatch); // cache locally
        }
      }
      if (!match) { toast.error('Match introuvable'); setFinishingId(null); return; }

      if (match.points.length > 0) {
        const sport = match.sport ?? 'volleyball';
        let blueScore: number, redScore: number;
        if (sport === 'basketball') {
          blueScore = match.points.filter(p => p.team === 'blue' && p.type === 'scored').reduce((s, p) => s + (p.pointValue ?? 0), 0);
          redScore = match.points.filter(p => p.team === 'red' && p.type === 'scored').reduce((s, p) => s + (p.pointValue ?? 0), 0);
        } else {
          blueScore = match.points.filter(p => p.team === 'blue').length;
          redScore = match.points.filter(p => p.team === 'red').length;
        }
        const winner: Team = blueScore >= redScore ? 'blue' : 'red';
        const setData: SetData = {
          id: crypto.randomUUID(),
          number: match.currentSetNumber,
          points: [...match.points],
          score: { blue: blueScore, red: redScore },
          winner,
          duration: match.chronoSeconds,
        };
        match.completedSets.push(setData);
        match.points = [];
      }
      const updated = { ...match, finished: true, updatedAt: Date.now() };
      saveMatch(updated);
      if (user) await saveCloudMatch(user.id, updated);
      loadMatches(user);
      setFinishingId(null);
    } catch (err) {
      console.error('Error finishing match:', err);
      toast.error('Erreur lors de la finalisation du match.');
      setFinishingId(null);
    }
  };

  const handleResume = (id: string) => {
    setActiveMatchId(id);
    navigate(`/match/${id}`);
  };

  const sportIcon = (sport?: SportType) => {
    switch (sport) {
      case 'basketball': return '🏀';
      case 'tennis': return '🎾';
      case 'padel': return '🏓';
      default: return '🏐';
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 py-6 border-b border-border flex flex-col items-center gap-3 relative">
        {/* Help button */}
        <div className="absolute top-4 left-4">
          <button
            onClick={() => setShowHelp(true)}
            className="p-1.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Aide"
          >
            <HelpCircle size={18} />
          </button>
        </div>
        {/* Auth button */}
        <div className="absolute top-4 right-4">
          {user ? (
            <UserMenu user={user} onOpenSavedPlayers={() => setShowSavedPlayers(true)} />
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-foreground text-xs font-medium hover:bg-secondary transition-all"
            >
              <LogIn size={14} />
              Connexion
            </button>
          )}
        </div>
        <img src={logoCapbreton} alt="Volleyball Capbreton" className="w-16 h-16 rounded-full object-cover" />
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight text-center">🏆 Netpoint Tracker</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">Volley · Basket · Tennis · Padel</p>
        </div>
      </header>

      {/* Auth dialog */}
      <AuthDialog
        open={showAuth}
        onOpenChange={setShowAuth}
        onGuest={() => { setGuestDismissed(true); sessionStorage.setItem('guestDismissed', 'true'); }}
      />

      {/* Help dialog */}
      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
          <div className="max-w-sm w-full max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <Instructions onClose={() => setShowHelp(false)} />
          </div>
        </div>
      )}

      <main className="flex-1 overflow-auto p-4 max-w-lg mx-auto w-full space-y-6">
        <PwaInstallBanner />
        {/* New match */}
        <button
          onClick={() => setShowNew(true)}
          className="group w-full relative flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-lg text-white overflow-hidden transition-all duration-300 active:scale-[0.97] hover:shadow-lg hover:shadow-action-scored/25"
          style={{ background: 'linear-gradient(135deg, hsl(var(--action-cta)), hsl(var(--action-cta-end)))' }}
        >
          <span className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300" />
          <Plus size={22} className="relative z-10 transition-transform duration-300 group-hover:rotate-90" />
          <span className="relative z-10">Nouveau Match</span>
        </button>

        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-center text-lg font-bold">Créer un match</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Sport selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground block">Sport</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { key: 'volleyball' as SportType, icon: '🏐', label: 'Volley-ball', hue: 'hsl(var(--primary))' },
                    { key: 'basketball' as SportType, icon: '🏀', label: 'Basket-ball', hue: 'hsl(30, 90%, 50%)' },
                    { key: 'tennis' as SportType, icon: '🎾', label: 'Tennis', hue: 'hsl(142, 70%, 40%)' },
                    { key: 'padel' as SportType, icon: '🏓', label: 'Padel', hue: 'hsl(210, 80%, 50%)' },
                  ]).map(s => (
                    <button
                      key={s.key}
                      onClick={() => setSelectedSport(s.key)}
                      className="py-3 rounded-xl font-bold text-sm transition-all border-2"
                      style={selectedSport === s.key
                        ? { background: `${s.hue}15`, color: s.hue, borderColor: `${s.hue}66` }
                        : { background: 'hsl(var(--secondary))', color: 'hsl(var(--secondary-foreground))', borderColor: 'transparent' }
                      }
                    >
                      {s.icon} {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-team-blue mb-1 block">Équipe Bleue <span className="text-muted-foreground font-normal">· votre équipe</span></label>
                  <Input
                    value={names.blue}
                    onChange={e => setNames(prev => ({ ...prev, blue: e.target.value }))}
                    placeholder="Nom de l'équipe bleue"
                    className="h-10"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-team-red mb-1 block">Équipe Rouge</label>
                  <Input
                    value={names.red}
                    onChange={e => setNames(prev => ({ ...prev, red: e.target.value }))}
                    placeholder="Nom de l'équipe rouge"
                    className="h-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowNew(false)}
                  className="flex-1 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreate}
                  className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-1.5"
                >
                  <Play size={16} /> Commencer
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Match history */}
        <div className="space-y-3">
          {loadingMatches && user ? (
            <div className="flex items-center justify-center gap-2 py-8">
              <Loader2 size={18} className="animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Chargement des matchs…</span>
            </div>
          ) : matches.length === 0 ? (
            <Instructions />
          ) : (
            <>
            <div className="flex items-center gap-2">
              <History size={16} className="text-muted-foreground" />
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Matchs précédents</h2>
            </div>
            <div className="space-y-2">
              {matches.map(match => {
                const sc = matchScore(match);
                const totalPoints = match.completedSets.reduce((sum, s) => sum + s.points.length, 0) + match.points.length;
                return (
                  <div key={match.id} className="bg-card rounded-xl p-4 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm font-bold">
                          <span className="text-base">{sportIcon(match.sport)}</span>
                          <span className="text-team-blue">{match.teamNames.blue}</span>
                          <span className="text-muted-foreground text-xs">vs</span>
                          <span className="text-team-red">{match.teamNames.red}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{formatDate(match.updatedAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-foreground tabular-nums">{sc.blue} - {sc.red}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {match.finished
                            ? (sc.blue > sc.red ? `🏆 ${match.teamNames.blue}` : sc.red > sc.blue ? `🏆 ${match.teamNames.red}` : 'Égalité')
                            : `${match.sport === 'basketball' ? 'QT' : 'Set'} ${match.currentSetNumber} en cours`} · {totalPoints} pts
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResume(match.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/15 text-primary font-semibold text-xs border border-primary/20 hover:bg-primary/25 transition-all"
                      >
                        {match.finished ? <><Eye size={14} /> Voir</> : <><Play size={14} /> Reprendre</>}
                      </button>
                      {!match.finished && (
                        <button
                          onClick={() => setFinishingId(match.id)}
                          className="px-3 py-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all"
                          title="Terminer le match"
                        >
                          <CheckCircle2 size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => setDeletingId(match.id)}
                        className="px-3 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            </>
          )}
        </div>
      </main>

      {/* Finish confirm modal */}
      {finishingId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setFinishingId(null)}>
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full border border-border space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground text-center">Terminer le match ?</h2>
            <p className="text-sm text-muted-foreground text-center">
              La période en cours sera finalisée et le match sera marqué comme terminé. Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setFinishingId(null)}
                className="flex-1 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm"
              >
                Annuler
              </button>
              <button
                onClick={() => handleFinishMatch(finishingId)}
                className="flex-1 py-2.5 rounded-lg bg-destructive text-destructive-foreground font-semibold text-sm flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 size={16} /> Terminer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setDeletingId(null)}>
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full border border-border space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground text-center">Supprimer le match ?</h2>
            <p className="text-sm text-muted-foreground text-center">
              Cette action est irréversible. Toutes les données du match seront perdues.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="flex-1 py-2.5 rounded-lg bg-destructive text-destructive-foreground font-semibold text-sm flex items-center justify-center gap-1.5"
              >
                <Trash2 size={16} /> Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved players manager */}
      {user && (
        <SavedPlayersManager
          open={showSavedPlayers}
          onOpenChange={setShowSavedPlayers}
          userId={user.id}
        />
      )}

      <footer className="px-4 py-4 border-t border-border text-center">
        <p className="text-xs text-muted-foreground">
          Made with ❤️ by <span className="font-semibold text-foreground">Volleyball Capbreton</span>
        </p>
      </footer>
    </div>
  );
}
