import { Link } from 'react-router-dom';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Help() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [sending, setSending] = useState(false);

  const handleFeedback = async () => {
    if (!feedbackMsg.trim()) return;
    setSending(true);
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      toast.error('Connectez-vous pour envoyer un feedback.');
      setSending(false);
      return;
    }
    const { error } = await supabase.from('feedback').insert({
      user_id: userId,
      message: feedbackMsg.trim(),
      email: session.user.email ?? '',
    });
    setSending(false);
    if (error) {
      toast.error('Erreur lors de l\'envoi.');
    } else {
      toast.success('Merci pour votre feedback !');
      setFeedbackMsg('');
      setFeedbackOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 py-3 border-b border-border flex items-center gap-3">
        <Link to="/" className="p-1.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-lg font-black text-foreground tracking-tight">Centre d'aide</h1>
      </header>

      <main className="flex-1 overflow-auto p-4 max-w-2xl mx-auto w-full space-y-8">
        {/* Section 1: Comment compter les points */}
        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">🏆 Comment compter les points</h2>
          <div className="bg-card rounded-xl p-4 border border-border text-sm text-muted-foreground space-y-3">
            <p>Appuyez sur <strong className="text-foreground">« + »</strong> sous le score de l'équipe qui marque, choisissez l'action (attaque, ace, faute adverse…), puis cliquez sur le terrain pour placer le point. Sélectionnez ensuite le joueur concerné.</p>
            <p>Le score se met à jour automatiquement. En <strong className="text-foreground">Tennis et Padel</strong>, le scoring 15-30-40-Jeu est géré automatiquement, y compris les avantages et le tie-break.</p>
          </div>
        </section>

        {/* Section 2: Analyser sa Heatmap */}
        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">🔥 Analyser sa Heatmap</h2>
          <div className="bg-card rounded-xl p-4 border border-border text-sm text-muted-foreground space-y-3">
            <p>Dans l'onglet <strong className="text-foreground">Statistiques</strong>, la heatmap affiche les zones d'impact de chaque équipe. Les zones chaudes (rouge) indiquent les endroits où le plus de points ont été marqués.</p>
            <p>Filtrez par set ou par type d'action pour une analyse plus fine. Exportez la heatmap en PNG pour vos rapports d'entraînement.</p>
          </div>
        </section>

        {/* Section 3: Gérer son équipe */}
        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">👥 Gérer son équipe</h2>
          <div className="bg-card rounded-xl p-4 border border-border text-sm text-muted-foreground space-y-3">
            <p>Ajoutez vos joueurs avec leur numéro et leur nom dans le <strong className="text-foreground">Roster</strong>. Ils sont sauvegardés automatiquement et réutilisables pour les prochains matchs.</p>
            <p>Les statistiques individuelles (points marqués, fautes) sont consultables dans l'onglet Stats.</p>
          </div>
        </section>

        {/* Section 4: Spécificités par sport */}
        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">🎯 Spécificités par sport</h2>
          <div className="space-y-3">
            <details className="bg-card rounded-xl border border-border">
              <summary className="p-4 font-semibold text-foreground cursor-pointer text-sm">🏐 Volleyball</summary>
              <div className="px-4 pb-4 text-sm text-muted-foreground space-y-2">
                <p><strong className="text-foreground">Points Gagnés :</strong> Attaque, Ace, Block, Bidouille, Seconde main</p>
                <p><strong className="text-foreground">Fautes adverses :</strong> Out, Filet, Service loupé, Block Out</p>
                <p>Le set se termine manuellement avec « Fin du Set ». Les côtés s'inversent automatiquement.</p>
              </div>
            </details>

            <details className="bg-card rounded-xl border border-border">
              <summary className="p-4 font-semibold text-foreground cursor-pointer text-sm">🏀 Basketball</summary>
              <div className="px-4 pb-4 text-sm text-muted-foreground space-y-2">
                <p><strong className="text-foreground">Paniers :</strong> Lancer franc (1pt), Tir intérieur (2pts), Tir à 3pts</p>
                <p><strong className="text-foreground">Actions négatives :</strong> Tir manqué, Perte de balle, Faute commise</p>
                <p>La zone au-delà de l'arc est réservée aux 3 points. Terminez chaque quart-temps avec « Fin QT ».</p>
              </div>
            </details>

            <details className="bg-card rounded-xl border border-border">
              <summary className="p-4 font-semibold text-foreground cursor-pointer text-sm">🎾 Tennis</summary>
              <div className="px-4 pb-4 text-sm text-muted-foreground space-y-2">
                <p><strong className="text-foreground">Coups gagnants :</strong> Ace, Coup droit/Revers gagnant, Volée, Smash</p>
                <p><strong className="text-foreground">Fautes adverses :</strong> Double faute, Out long/latéral, Filet</p>
                <p>Scoring automatique : 0 → 15 → 30 → 40 → Jeu. Deuce à 40-40, puis Avantage. Tie-break à 6-6.</p>
              </div>
            </details>

            <details className="bg-card rounded-xl border border-border">
              <summary className="p-4 font-semibold text-foreground cursor-pointer text-sm">🏓 Padel</summary>
              <div className="px-4 pb-4 text-sm text-muted-foreground space-y-2">
                <p><strong className="text-foreground">Coups gagnants :</strong> Víbora, Bandeja, Smash, Bajada, Par 3</p>
                <p><strong className="text-foreground">Fautes adverses :</strong> Double faute, Grille, Vitre, Out</p>
                <p>Même scoring que le tennis avec option punto de oro configurable.</p>
              </div>
            </details>
          </div>
        </section>

        {/* Section 5: Export & Partage */}
        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">📤 Export & Partage</h2>
          <div className="bg-card rounded-xl p-4 border border-border text-sm text-muted-foreground space-y-3">
            <p>Exportez vos stats en <strong className="text-foreground">PNG</strong> (capture d'écran), en <strong className="text-foreground">Excel (XLSX)</strong> détaillé set par set, ou partagez le match via un <strong className="text-foreground">lien unique</strong> en lecture seule.</p>
          </div>
        </section>

        {/* Feedback button - always visible */}
        <section className="pb-6">
          <button
            onClick={() => setFeedbackOpen(!feedbackOpen)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
          >
            <MessageSquare size={16} /> Laisser un feedback
          </button>
          {feedbackOpen && (
            <div className="mt-3 bg-card rounded-xl p-4 border border-border space-y-3">
              <textarea
                value={feedbackMsg}
                onChange={e => setFeedbackMsg(e.target.value)}
                placeholder="Votre suggestion, bug ou idée..."
                className="w-full rounded-lg border border-border bg-background text-foreground text-sm p-3 min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={handleFeedback}
                disabled={sending || !feedbackMsg.trim()}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50"
              >
                {sending ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
