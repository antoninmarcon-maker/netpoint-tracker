import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Activity, BarChart3, ArrowLeft, Loader2, Share2 } from 'lucide-react';
import { getMatchByShareToken } from '@/lib/cloudStorage';
import { MatchSummary } from '@/types/sports';
import { SetHistory } from '@/components/SetHistory';
import { ScoreBoard } from '@/components/ScoreBoard';
import { VolleyballCourt } from '@/components/VolleyballCourt';
import { BasketballCourt } from '@/components/BasketballCourt';
import { TennisCourt } from '@/components/TennisCourt';
import { PadelCourt } from '@/components/PadelCourt';
import { HeatmapView } from '@/components/HeatmapView';

type Tab = 'match' | 'stats';

export default function SharedMatch() {
  const { token } = useParams<{ token: string }>();
  const [match, setMatch] = useState<MatchSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>('stats');

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    getMatchByShareToken(token).then(data => {
      if (data) setMatch(data);
      else setNotFound(true);
      setLoading(false);
    });
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (notFound || !match) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-lg font-bold text-foreground">Match introuvable</p>
        <p className="text-sm text-muted-foreground text-center">Ce lien de partage n'existe pas ou a été supprimé.</p>
        <Link to="/" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
          Accueil
        </Link>
      </div>
    );
  }

  const isBasketball = match.sport === 'basketball';
  const sport = match.sport ?? 'volleyball';
  const sportIcon = sport === 'basketball' ? '🏀' : sport === 'tennis' ? '🎾' : sport === 'padel' ? '🏓' : '🏐';
  const allPoints = [...match.completedSets.flatMap(s => s.points), ...match.points];
  const blueScored = allPoints.filter(p => p.team === 'blue' && p.type === 'scored').length;
  const redScored = allPoints.filter(p => p.team === 'red' && p.type === 'scored').length;
  const setsScore = {
    blue: match.completedSets.filter(s => s.winner === 'blue').length,
    red: match.completedSets.filter(s => s.winner === 'red').length,
  };

  const score = isBasketball
    ? {
        blue: match.points.filter(p => p.team === 'blue' && p.type === 'scored').reduce((s, p) => s + (p.pointValue ?? 0), 0),
        red: match.points.filter(p => p.team === 'red' && p.type === 'scored').reduce((s, p) => s + (p.pointValue ?? 0), 0),
      }
    : {
        blue: match.points.filter(p => p.team === 'blue').length,
        red: match.points.filter(p => p.team === 'red').length,
      };

  const stats = {
    blue: { scored: blueScored, faults: allPoints.filter(p => p.team === 'blue' && p.type === 'fault').length },
    red: { scored: redScored, faults: allPoints.filter(p => p.team === 'red' && p.type === 'fault').length },
    total: allPoints.length,
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 py-3 border-b border-border flex items-center justify-between">
        <Link to="/" className="p-1.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-lg font-black text-foreground tracking-tight text-center flex-1 mx-2">
          {sportIcon} {match.teamNames.blue} vs {match.teamNames.red}
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const url = window.location.href;
              if (navigator.share) {
                navigator.share({ title: `${match.teamNames.blue} vs ${match.teamNames.red}`, text: 'Suivez le score sur my-volley.com', url });
              } else {
                navigator.clipboard.writeText(url);
                import('sonner').then(({ toast }) => toast.success('Lien copié !'));
              }
            }}
            className="p-1.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Partager"
          >
            <Share2 size={16} />
          </button>
          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold uppercase">Lecture seule</span>
        </div>
      </header>

      <nav className="flex border-b border-border">
        <button
          onClick={() => setTab('match')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${tab === 'match' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
        >
          <Activity size={16} /> Match
        </button>
        <button
          onClick={() => setTab('stats')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${tab === 'stats' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
        >
          <BarChart3 size={16} /> Statistiques
        </button>
      </nav>

      <main className="flex-1 overflow-auto p-4 max-w-2xl mx-auto w-full">
        {tab === 'match' ? (
          <div className="space-y-4">
            <SetHistory
              completedSets={match.completedSets}
              currentSetNumber={match.currentSetNumber}
              setsScore={setsScore}
              teamNames={match.teamNames}
              isFinished={match.finished}
              sport={match.sport}
            />
            <div className="bg-card rounded-xl p-4 border border-border text-center space-y-2">
              <div className="flex items-center justify-center gap-6">
                <div>
                  <p className="text-xs font-bold text-team-blue uppercase">{match.teamNames.blue}</p>
                  <p className="text-4xl font-black text-team-blue">{score.blue}</p>
                </div>
                <span className="text-sm font-bold text-muted-foreground">VS</span>
                <div>
                  <p className="text-xs font-bold text-team-red uppercase">{match.teamNames.red}</p>
                  <p className="text-4xl font-black text-team-red">{score.red}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {match.finished ? '✅ Match terminé' : `${isBasketball ? 'QT' : 'Set'} ${match.currentSetNumber} en cours`}
              </p>
            </div>
            {sport === 'basketball' ? (
              <BasketballCourt points={match.points} selectedTeam={null} selectedAction="attack" selectedPointType="scored" sidesSwapped={match.sidesSwapped} teamNames={match.teamNames} onCourtClick={() => {}} />
            ) : sport === 'tennis' ? (
              <TennisCourt points={match.points} selectedTeam={null} selectedAction="attack" selectedPointType="scored" sidesSwapped={match.sidesSwapped} teamNames={match.teamNames} onCourtClick={() => {}} />
            ) : sport === 'padel' ? (
              <PadelCourt points={match.points} selectedTeam={null} selectedAction="attack" selectedPointType="scored" sidesSwapped={match.sidesSwapped} teamNames={match.teamNames} onCourtClick={() => {}} />
            ) : (
              <VolleyballCourt points={match.points} selectedTeam={null} selectedAction="attack" selectedPointType="scored" sidesSwapped={match.sidesSwapped} teamNames={match.teamNames} onCourtClick={() => {}} />
            )}
          </div>
        ) : (
          <HeatmapView
            points={allPoints}
            completedSets={match.completedSets}
            currentSetPoints={match.points}
            currentSetNumber={match.currentSetNumber}
            stats={stats}
            teamNames={match.teamNames}
            players={match.players}
            sport={match.sport}
          />
        )}
      </main>
    </div>
  );
}
