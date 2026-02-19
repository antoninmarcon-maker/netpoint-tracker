import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, History, Trash2, Eye, Play, Info, CheckCircle2 } from 'lucide-react';
import logoCapbreton from '@/assets/logo-capbreton.jpeg';
import { Input } from '@/components/ui/input';
import { getAllMatches, createNewMatch, saveMatch, setActiveMatchId, deleteMatch, getMatch } from '@/lib/matchStorage';
import { MatchSummary, SetData, Team } from '@/types/volleyball';
import { PwaInstallBanner } from '@/components/PwaInstallBanner';

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function matchScore(match: MatchSummary) {
  const blue = match.completedSets.filter(s => s.winner === 'blue').length;
  const red = match.completedSets.filter(s => s.winner === 'red').length;
  return { blue, red };
}

function Instructions() {
  return (
    <div className="bg-card rounded-xl p-5 border border-border space-y-3">
      <div className="flex items-center gap-2">
        <Info size={16} className="text-primary" />
        <h3 className="text-sm font-bold text-foreground">Comment ça marche ?</h3>
      </div>
      <div className="text-sm text-muted-foreground space-y-2">
        <p><strong className="text-foreground">1. Créez un match</strong> en appuyant sur « Nouveau Match » et nommez les deux équipes.</p>
        <p><strong className="text-foreground">2. Définissez votre roster</strong> : ajoutez les joueurs (numéro + nom) pour suivre leurs stats individuelles.</p>
        <p><strong className="text-foreground">3. Appuyez sur « + »</strong> sous le score de l'équipe qui marque. Une flèche animée indique l'équipe sélectionnée.</p>
        <p><strong className="text-foreground">4. Choisissez l'action</strong> : <em>Points Gagnés</em> (Attaque, Ace, Block, Bidouille, Seconde main) ou <em>Fautes Adverses</em> (Out, Filet, Service loupé, Block Out).</p>
        <p><strong className="text-foreground">5. Placez sur le terrain</strong> : la zone autorisée s'illumine. Cliquez puis sélectionnez le joueur concerné.</p>
        <p><strong className="text-foreground">6. Gérez les sets</strong> : « Fin du Set » termine et inverse les côtés. Le gagnant du match est l'équipe avec le plus de sets remportés 🏆.</p>
        <p><strong className="text-foreground">7. Statistiques</strong> : consultez les stats par joueur (points ⚡ et fautes ❌ dépliables) et la heatmap des actions.</p>
        <p><strong className="text-foreground">8. Exportez & Partagez</strong> : téléchargez stats PNG, terrain par set, Excel ou partagez le score via WhatsApp, Telegram, X.</p>
        <p><strong className="text-foreground">9. Installez l'app</strong> : sur mobile, suivez le bandeau pour ajouter l'app à votre écran d'accueil (hors-ligne supporté).</p>
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [showNew, setShowNew] = useState(false);
  const [names, setNames] = useState({ blue: '', red: '' });
  const [matches, setMatches] = useState<MatchSummary[]>(() => getAllMatches().sort((a, b) => b.updatedAt - a.updatedAt));

  const handleCreate = () => {
    const match = createNewMatch({
      blue: names.blue.trim() || 'Bleue',
      red: names.red.trim() || 'Rouge',
    });
    saveMatch(match);
    setActiveMatchId(match.id);
    navigate(`/match/${match.id}`);
  };

  const handleDelete = (id: string) => {
    deleteMatch(id);
    setMatches(getAllMatches().sort((a, b) => b.updatedAt - a.updatedAt));
  };

  const [finishingId, setFinishingId] = useState<string | null>(null);

  const handleFinishMatch = (id: string) => {
    const match = getMatch(id);
    if (!match) return;
    // End current set if there are points
    if (match.points.length > 0) {
      const blueScore = match.points.filter(p => p.team === 'blue').length;
      const redScore = match.points.filter(p => p.team === 'red').length;
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
    saveMatch({ ...match, finished: true, updatedAt: Date.now() });
    setMatches(getAllMatches().sort((a, b) => b.updatedAt - a.updatedAt));
    setFinishingId(null);
  };

  const handleResume = (id: string) => {
    setActiveMatchId(id);
    navigate(`/match/${id}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 py-6 border-b border-border flex flex-col items-center gap-3">
        <img src={logoCapbreton} alt="Volleyball Capbreton" className="w-16 h-16 rounded-full object-cover" />
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight text-center">
            🏐 Volley Tracker
          </h1>
          <p className="text-sm text-muted-foreground text-center mt-1">Suivi de matchs de volley-ball</p>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 max-w-lg mx-auto w-full space-y-6">
        <PwaInstallBanner />
        {/* New match */}
        {!showNew ? (
          <button
            onClick={() => setShowNew(true)}
            className="group w-full relative flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-lg text-white overflow-hidden transition-all duration-300 active:scale-[0.97] hover:shadow-lg hover:shadow-action-scored/25"
            style={{ background: 'linear-gradient(135deg, hsl(var(--action-cta)), hsl(var(--action-cta-end)))' }}
          >
            <span className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300" />
            <Plus size={22} className="relative z-10 transition-transform duration-300 group-hover:rotate-90" /> 
            <span className="relative z-10">Nouveau Match</span>
          </button>
        ) : (
          <div className="bg-card rounded-xl p-5 border border-border space-y-4">
            <h2 className="text-base font-bold text-foreground">Créer un match</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-team-blue mb-1 block">Équipe Bleue <span className="text-muted-foreground font-normal">· votre équipe (roster configurable)</span></label>
                <Input
                  value={names.blue}
                  onChange={e => setNames(prev => ({ ...prev, blue: e.target.value }))}
                  placeholder="Nom de l'équipe bleue"
                  className="h-10"
                  autoFocus
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
        )}

        {/* Match history */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <History size={16} className="text-muted-foreground" />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Matchs précédents</h2>
          </div>

        {matches.length === 0 ? (
            <Instructions />
          ) : (
            <div className="space-y-2">
              {matches.map(match => {
                const sc = matchScore(match);
                const totalPoints = match.completedSets.reduce((sum, s) => sum + s.points.length, 0) + match.points.length;
                return (
                  <div key={match.id} className="bg-card rounded-xl p-4 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm font-bold">
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
                            : `Set ${match.currentSetNumber} en cours`} · {totalPoints} pts
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
                        onClick={() => handleDelete(match.id)}
                        className="px-3 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Finish confirm modal */}
      {finishingId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setFinishingId(null)}>
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full border border-border space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground text-center">Terminer le match ?</h2>
            <p className="text-sm text-muted-foreground text-center">
              Le set en cours sera finalisé et le match sera marqué comme terminé. Cette action est irréversible.
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

      <footer className="px-4 py-4 border-t border-border text-center">
        <p className="text-xs text-muted-foreground">
          Made with ❤️ by <span className="font-semibold text-foreground">Volleyball Capbreton</span>
        </p>
      </footer>
    </div>
  );
}
