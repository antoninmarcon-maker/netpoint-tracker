import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Trophy, Eye } from 'lucide-react';
import { getTournamentBySpectatorToken, getTeams, getMatches } from '@/lib/tournamentStorage';
import type { Tournament, TournamentTeam, TournamentMatch } from '@/types/tournament';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export default function TournamentSpectator() {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') ?? '';

    const [loading, setLoading] = useState(true);
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [teams, setTeams] = useState<TournamentTeam[]>([]);
    const [matches, setMatches] = useState<TournamentMatch[]>([]);

    useEffect(() => {
        if (!token) { setLoading(false); return; }
        getTournamentBySpectatorToken(token).then(async tournament => {
            if (!tournament) { toast.error(t('tournaments.invalidSpectatorLink') || 'Lien invalide'); setLoading(false); return; }
            setTournament(tournament);
            const [tm, mx] = await Promise.all([getTeams(tournament.id), getMatches(tournament.id)]);
            setTeams(tm);
            setMatches(mx);
            setLoading(false);
        }).catch(err => { console.error(err); toast.error(t('common.error') || 'Erreur'); setLoading(false); });
    }, [token]);

    // Real-time updates — score changes propagate instantly
    useEffect(() => {
        if (!id) return;
        const ch = supabase.channel(`spectate-${id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_matches', filter: `tournament_id=eq.${id}` }, () => {
                getMatches(id!).then(setMatches);
            }).subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [id]);

    if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>;

    if (!tournament) return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
            <Trophy size={40} className="text-muted-foreground" />
            <p className="font-bold text-foreground">{t('tournaments.invalidSpectatorLink')}</p>
            <p className="text-sm text-muted-foreground">{t('tournaments.linkExpired')}</p>
        </div>
    );

    const liveMatches = matches.filter(m => m.status === 'in_progress');
    const finishedMatches = matches.filter(m => m.status === 'finished' || m.status === 'locked');
    const pendingMatches = matches.filter(m => m.status === 'pending');

    const results = teams.map(team => {
        const tm = matches.filter(m => m.team_blue_id === team.id || m.team_red_id === team.id);
        return {
            team,
            wins: tm.filter(m => m.winner_id === team.id).length,
            losses: tm.filter(m => m.winner_id && m.winner_id !== team.id).length,
            played: tm.length,
        };
    }).sort((a, b) => b.wins - a.wins);

    const MatchCard = ({ match }: { match: TournamentMatch }) => {
        const blue = teams.find(t => t.id === match.team_blue_id);
        const red = teams.find(t => t.id === match.team_red_id);
        const bw = (match.score_blue ?? []).filter((s, i) => s > (match.score_red?.[i] ?? 0)).length;
        const rw = (match.score_red ?? []).filter((s, i) => s > (match.score_blue?.[i] ?? 0)).length;
        return (
            <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">{match.match_ref}</p>
                <div className="flex items-center gap-3">
                    <span className={`flex-1 text-right font-bold text-sm truncate ${match.winner_id === match.team_blue_id ? 'text-emerald-500' : ''}`}>{blue?.name ?? '?'}</span>
                    <div className="flex items-center gap-1 font-black text-base">
                        <span>{bw}</span>
                        <span className="text-muted-foreground text-xs mx-0.5">—</span>
                        <span>{rw}</span>
                    </div>
                    <span className={`flex-1 text-left font-bold text-sm truncate ${match.winner_id === match.team_red_id ? 'text-emerald-500' : ''}`}>{red?.name ?? '?'}</span>
                </div>
                {match.score_blue && match.score_blue.length > 0 && (
                    <div className="flex justify-center gap-3 mt-2">
                        {match.score_blue.map((sb, i) => (
                            <span key={i} className="text-[11px] text-muted-foreground font-mono">
                                {sb}:{match.score_red?.[i] ?? 0}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="px-4 pt-[max(0.75rem,env(safe-area-inset-top))] py-4 border-b border-border">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <Trophy size={18} className="text-primary" />
                        <h1 className="font-black text-foreground text-base">{tournament.name}</h1>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        <Eye size={10} /> {t('tournaments.readOnly')}
                    </span>
                </div>
                {tournament.location && <p className="text-xs text-muted-foreground">{tournament.location}</p>}
            </header>

            <main className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-6">
                {/* Live matches */}
                {liveMatches.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <h2 className="text-sm font-black text-foreground uppercase tracking-wide">{t('tournaments.live')}</h2>
                        </div>
                        <div className="space-y-2">
                            {liveMatches.map(m => <MatchCard key={m.id} match={m} />)}
                        </div>
                    </section>
                )}

                {/* Standings */}
                {results.length > 0 && (
                    <section>
                        <h2 className="text-sm font-black text-foreground uppercase tracking-wide mb-3">{t('tournaments.standings')}</h2>
                        <div className="space-y-2">
                            {results.map(({ team, wins, losses, played }, i) => (
                                <div key={team.id} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                                    <span className="text-base font-black w-6 text-center">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                                    <div className="flex-1">
                                        <p className="font-bold text-foreground text-sm">{team.name}</p>
                                        <p className="text-xs text-muted-foreground">{t('tournaments.matchesCount', { count: played })}</p>
                                    </div>
                                    <div className="flex gap-2 text-xs font-bold">
                                        <span className="text-emerald-500">{wins}V</span>
                                        <span className="text-destructive">{losses}D</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Finished matches */}
                {finishedMatches.length > 0 && (
                    <section>
                        <h2 className="text-sm font-black text-foreground uppercase tracking-wide mb-3">{t('tournaments.finishedMatches')}</h2>
                        <div className="space-y-2">
                            {finishedMatches.map(m => <MatchCard key={m.id} match={m} />)}
                        </div>
                    </section>
                )}

                {/* Pending matches */}
                {pendingMatches.length > 0 && (
                    <section>
                        <h2 className="text-sm font-black text-foreground uppercase tracking-wide mb-3">{t('tournaments.upcoming')}</h2>
                        <div className="space-y-2">
                            {pendingMatches.map(m => <MatchCard key={m.id} match={m} />)}
                        </div>
                    </section>
                )}

                {matches.length === 0 && (
                    <div className="text-center py-16 text-muted-foreground text-sm">{t('tournaments.noUpcomingMatches')}</div>
                )}
            </main>
        </div>
    );
}
