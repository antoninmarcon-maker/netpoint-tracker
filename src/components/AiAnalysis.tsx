import { useState } from 'react';
import { Sparkles, X, Loader2, Copy, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Point, SetData, Player, SportType, TENNIS_SCORED_ACTIONS, TENNIS_FAULT_ACTIONS, PADEL_SCORED_ACTIONS, PADEL_FAULT_ACTIONS } from '@/types/sports';
import ReactMarkdown from 'react-markdown';

interface AiAnalysisProps {
  points: Point[];
  completedSets: SetData[];
  currentSetPoints: Point[];
  teamNames: { blue: string; red: string };
  players: Player[];
  sport: SportType;
  isLoggedIn: boolean;
  onLoginRequired: () => void;
}

const SPORT_LABELS: Record<SportType, string> = {
  volleyball: 'Volleyball',
  basketball: 'Basketball',
  tennis: 'Tennis',
  padel: 'Padel',
};

function buildMatchStatsText(
  points: Point[],
  completedSets: SetData[],
  currentSetPoints: Point[],
  teamNames: { blue: string; red: string },
  players: Player[],
  sport: SportType,
): string {
  const allPts = [...completedSets.flatMap(s => s.points), ...currentSetPoints];
  const isBasket = sport === 'basketball';

  let text = `Sport: ${SPORT_LABELS[sport]}\n`;
  text += `Équipes: ${teamNames.blue} (bleue) vs ${teamNames.red} (rouge)\n`;
  text += `Sets terminés: ${completedSets.length}\n`;

  completedSets.forEach(s => {
    text += `  Set ${s.number}: ${s.score.blue}-${s.score.red} (gagnant: ${s.winner === 'blue' ? teamNames.blue : teamNames.red}, durée: ${Math.floor(s.duration / 60)}min)\n`;
  });

  if (currentSetPoints.length > 0) {
    const bs = isBasket
      ? currentSetPoints.filter(p => p.team === 'blue' && p.type === 'scored').reduce((s, p) => s + (p.pointValue ?? 0), 0)
      : currentSetPoints.filter(p => p.team === 'blue').length;
    const rs = isBasket
      ? currentSetPoints.filter(p => p.team === 'red' && p.type === 'scored').reduce((s, p) => s + (p.pointValue ?? 0), 0)
      : currentSetPoints.filter(p => p.team === 'red').length;
    text += `  Set en cours: ${bs}-${rs}\n`;
  }

  // Player stats
  if (players.length > 0) {
    text += `\nStats par joueur (${teamNames.blue}):\n`;
    players.forEach(p => {
      const pp = allPts.filter(pt => pt.playerId === p.id);
      const scored = pp.filter(pt => pt.team === 'blue' && pt.type === 'scored');
      const negatives = pp.filter(pt => pt.team === 'red');
      const total = scored.length + negatives.length;
      if (total === 0) return;
      const eff = total > 0 ? ((scored.length / total) * 100).toFixed(0) : '0';
      text += `  ${p.name || '—'}: ${scored.length} pts gagnés, ${negatives.length} négatifs, efficacité ${eff}%`;
      
      // Action breakdown
      const actions: Record<string, number> = {};
      scored.forEach(pt => { actions[pt.action] = (actions[pt.action] || 0) + 1; });
      const details = Object.entries(actions).map(([a, c]) => `${a}:${c}`).join(', ');
      if (details) text += ` (${details})`;
      text += '\n';
    });
  }

  // Team totals with sport-specific breakdown
  for (const team of ['blue', 'red'] as const) {
    const tp = allPts.filter(p => p.team === team);
    const scored = tp.filter(p => p.type === 'scored');
    const faults = tp.filter(p => p.type === 'fault');
    text += `\n${teamNames[team]}:\n`;
    text += `  Points marqués: ${scored.length}\n`;
    text += `  Fautes directes: ${faults.length}\n`;

    // Sport-specific action breakdown
    if (sport === 'tennis') {
      const actionBreakdown = (pts: Point[], actions: { key: string; label: string }[]) =>
        actions.map(a => `${a.label}: ${pts.filter(p => p.action === a.key).length}`).join(', ');
      text += `  Coups gagnants: ${actionBreakdown(scored, TENNIS_SCORED_ACTIONS)}\n`;
      text += `  Fautes: ${actionBreakdown(faults, TENNIS_FAULT_ACTIONS)}\n`;
    } else if (sport === 'padel') {
      const actionBreakdown = (pts: Point[], actions: { key: string; label: string }[]) =>
        actions.map(a => `${a.label}: ${pts.filter(p => p.action === a.key).length}`).join(', ');
      text += `  Coups gagnants: ${actionBreakdown(scored, PADEL_SCORED_ACTIONS)}\n`;
      text += `  Fautes: ${actionBreakdown(faults, PADEL_FAULT_ACTIONS)}\n`;
    }
  }

  return text;
}

export function AiAnalysis({ points, completedSets, currentSetPoints, teamNames, players, sport, isLoggedIn, onLoginRequired }: AiAnalysisProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleClick = () => {
    if (!isLoggedIn) {
      onLoginRequired();
      return;
    }
    setShowDialog(true);
    if (!analysis) fetchAnalysis();
  };

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      const matchStats = buildMatchStatsText(points, completedSets, currentSetPoints, teamNames, players, sport);
      const { data, error } = await supabase.functions.invoke('analyze-match', {
        body: { matchStats, sport },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalysis(data.analysis);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'analyse');
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
        style={{ background: 'linear-gradient(135deg, hsl(280, 70%, 50%), hsl(320, 70%, 50%))', color: 'white' }}
      >
        <Sparkles size={14} />
        Analyse
      </button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md rounded-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-bold flex items-center justify-center gap-2">
              <Sparkles size={18} className="text-purple-400" />
              Analyse du match
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {loading ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 size={28} className="animate-spin text-purple-400" />
                <p className="text-sm text-muted-foreground">Analyse en cours...</p>
              </div>
            ) : analysis ? (
              <div className="prose prose-sm prose-invert max-w-none text-sm text-foreground leading-relaxed">
                <ReactMarkdown>{analysis}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune analyse disponible.</p>
            )}
            {!loading && analysis && (
              <>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(analysis);
                    setCopied(true);
                    toast.success('Analyse copiée !');
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="w-full py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold hover:bg-secondary/80 transition-all flex items-center justify-center gap-1.5"
                >
                  {copied ? <><Check size={14} /> Copié !</> : <><Copy size={14} /> Copier l'analyse</>}
                </button>
                <p className="text-[10px] text-muted-foreground text-center mt-1">Ce texte a été rédigé automatiquement à partir de l'analyse statistique du match.</p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
