import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Loader2, Users, Swords, Trophy, QrCode, Copy, Shuffle, Lock, Unlock, Plus, Trash2, Crown, CheckCircle, XCircle } from 'lucide-react';
import {
    getTournamentById, getTeams, getMembers, getMatches,
    toggleStrictValidation, createTeam, deleteTeam, createMatch, deleteMatch,
    updateMatchScore, lockMatch, randomDispatch, acceptCaptaincyRequest, leaveTeam
} from '@/lib/tournamentStorage';
import type { Tournament, TournamentTeam, TournamentMember, TournamentMatch } from '@/types/tournament';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';

type Tab = 'teams' | 'matches' | 'results';

function ScoreEditor({ match, teams, setsToWin, onSave }: {
    match: TournamentMatch; teams: TournamentTeam[]; setsToWin: number;
    onSave: (sb: number[], sr: number[], wid?: string) => void;
}) {
    const [scoreBlue, setScoreBlue] = useState<number[]>(match.score_blue ?? []);
    const [scoreRed, setScoreRed] = useState<number[]>(match.score_red ?? []);
    const blue = teams.find(t => t.id === match.team_blue_id);
    const red = teams.find(t => t.id === match.team_red_id);
    const blueWins = scoreBlue.filter((s, i) => s > (scoreRed[i] ?? 0)).length;
    const redWins = scoreRed.filter((s, i) => s > (scoreBlue[i] ?? 0)).length;

    const adj = (team: 'b' | 'r', i: number, d: number) => {
        const set = team === 'b' ? setScoreBlue : setScoreRed;
        set(prev => { const n = [...prev]; n[i] = Math.max(0, (n[i] ?? 0) + d); return n; });
    };

    const save = () => {
        const wid = blueWins >= setsToWin ? match.team_blue_id ?? undefined
            : redWins >= setsToWin ? match.team_red_id ?? undefined : undefined;
        onSave(scoreBlue, scoreRed, wid);
    };

    return (
        <div className="space-y-2">
            <div className="flex text-xs font-bold text-muted-foreground uppercase">
                <span className="flex-1 text-center">{blue?.name ?? 'Équipe B'}</span>
                <span className="w-8 text-center">Set</span>
                <span className="flex-1 text-center">{red?.name ?? 'Équipe R'}</span>
            </div>
            {scoreBlue.map((_, i) => (
                <div key={i} className="flex items-center gap-1">
                    <div className="flex-1 flex items-center justify-center gap-2">
                        <button onClick={() => adj('b', i, -1)} className="w-7 h-7 rounded-lg bg-secondary text-sm font-bold">−</button>
                        <span className="w-8 text-center font-black text-lg">{scoreBlue[i] ?? 0}</span>
                        <button onClick={() => adj('b', i, 1)} className="w-7 h-7 rounded-lg bg-secondary text-sm font-bold">+</button>
                    </div>
                    <span className="w-8 text-center text-xs text-muted-foreground font-semibold">{i + 1}</span>
                    <div className="flex-1 flex items-center justify-center gap-2">
                        <button onClick={() => adj('r', i, -1)} className="w-7 h-7 rounded-lg bg-secondary text-sm font-bold">−</button>
                        <span className="w-8 text-center font-black text-lg">{scoreRed[i] ?? 0}</span>
                        <button onClick={() => adj('r', i, 1)} className="w-7 h-7 rounded-lg bg-secondary text-sm font-bold">+</button>
                    </div>
                </div>
            ))}
            <div className="flex gap-2 mt-1">
                <button onClick={() => { setScoreBlue(p => [...p, 0]); setScoreRed(p => [...p, 0]); }}
                    className="flex-1 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground">+ Set</button>
                <button onClick={save} className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold">Valider</button>
            </div>
            <div className="flex justify-between text-xs font-bold">
                <span className={blueWins > redWins ? 'text-emerald-500' : 'text-muted-foreground'}>{blueWins}V</span>
                <span className={redWins > blueWins ? 'text-emerald-500' : 'text-muted-foreground'}>{redWins}V</span>
            </div>
        </div>
    );
}

export default function TournamentDashboard() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [teams, setTeams] = useState<TournamentTeam[]>([]);
    const [members, setMembers] = useState<TournamentMember[]>([]);
    const [matches, setMatches] = useState<TournamentMatch[]>([]);
    const [userId, setUserId] = useState<string | null>(null);
    const [tab, setTab] = useState<Tab>('teams');
    const [showQR, setShowQR] = useState<'join' | 'spectate' | null>(null);
    const [showCreateMatch, setShowCreateMatch] = useState(false);
    const [matchBlueId, setMatchBlueId] = useState('');
    const [matchRedId, setMatchRedId] = useState('');
    const [matchRound, setMatchRound] = useState(1);
    const [expandedMatch, setExpandedMatch] = useState<string | null>(null);

    const isAdmin = tournament?.created_by === userId;
    const joinUrl = `${window.location.origin}/tournaments/${id}/join?token=${tournament?.join_token}`;
    const spectateUrl = `${window.location.origin}/tournaments/${id}/spectate?token=${tournament?.spectator_token}`;
    const myMembership = members.find(m => m.user_id === userId);
    const captainRequests = members.filter(m => m.role === 'captain_request');

    useEffect(() => {
        if (!id) return;
        supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
        Promise.all([getTournamentById(id), getTeams(id), getMembers(id), getMatches(id)]).then(([t, tm, mb, mx]) => {
            setTournament(t); setTeams(tm); setMembers(mb); setMatches(mx); setLoading(false);
        });
    }, [id]);

    useEffect(() => {
        if (!id) return;
        const ch = supabase.channel(`t-${id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_matches', filter: `tournament_id=eq.${id}` }, () => {
                getMatches(id).then(setMatches);
            }).subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [id]);

    const copy = (url: string) => { navigator.clipboard.writeText(url); toast.success('Lien copié !'); };

    const handleRandomDispatch = async () => {
        if (!id || !confirm(`Dispatcher aléatoirement ${teams.length} équipes ?`)) return;
        const ok = await randomDispatch(id, teams);
        if (ok) { getMatches(id).then(setMatches); toast.success('Matchs générés !'); }
    };

    const handleCreateMatch = async () => {
        if (!id || !matchBlueId || !matchRedId || matchBlueId === matchRedId) { toast.error('Sélectionne deux équipes différentes'); return; }
        const m = await createMatch(id, matchBlueId, matchRedId, matchRound);
        if (m) { setMatches(p => [...p, m]); setShowCreateMatch(false); setMatchBlueId(''); setMatchRedId(''); toast.success('Match créé'); }
    };

    const handleSaveScore = async (match: TournamentMatch, sb: number[], sr: number[], wid?: string) => {
        const ok = await updateMatchScore(match.id, sb, sr, tournament?.sets_to_win ?? 2, wid);
        if (ok) { setMatches(p => p.map(m => m.id === match.id ? { ...m, score_blue: sb, score_red: sr, winner_id: wid ?? null } : m)); setExpandedMatch(null); toast.success('Score enregistré'); }
    };

    if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>;
    if (!tournament) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-foreground font-bold">Tournoi introuvable</p></div>;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="px-4 pt-safe-top py-3 border-b border-border space-y-3">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/tournaments')} className="p-1.5 rounded-full bg-secondary text-muted-foreground"><ArrowLeft size={18} /></button>
                    <div className="flex-1 min-w-0">
                        <h1 className="font-black text-foreground text-base truncate">{tournament.name}</h1>
                        <p className="text-xs text-muted-foreground">{tournament.location}{tournament.date && ` • ${new Date(tournament.date).toLocaleDateString('fr-FR')}`}</p>
                    </div>
                    {isAdmin && (
                        <button onClick={() => setTournament(p => p ? { ...p, strict_validation: !p.strict_validation } : p) || toggleStrictValidation(tournament.id, !tournament.strict_validation)}
                            className={`p-1.5 rounded-lg ${tournament.strict_validation ? 'bg-amber-500/15 text-amber-500' : 'bg-secondary text-muted-foreground'}`}>
                            {tournament.strict_validation ? <Lock size={16} /> : <Unlock size={16} />}
                        </button>
                    )}
                </div>
                {isAdmin && (
                    <div className="flex gap-2 overflow-x-auto pb-0.5">
                        <button onClick={() => setShowQR('join')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary text-xs font-semibold text-muted-foreground whitespace-nowrap"><QrCode size={12} /> Inscription</button>
                        <button onClick={() => setShowQR('spectate')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary text-xs font-semibold text-muted-foreground whitespace-nowrap"><QrCode size={12} /> Spectateurs</button>
                        <button onClick={handleRandomDispatch} disabled={teams.length < 2} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary text-xs font-semibold text-muted-foreground whitespace-nowrap disabled:opacity-40"><Shuffle size={12} /> Aléatoire</button>
                        <button onClick={() => setShowCreateMatch(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-xs font-semibold text-primary-foreground whitespace-nowrap"><Plus size={12} /> Match</button>
                    </div>
                )}
                {isAdmin && captainRequests.length > 0 && (
                    <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2">
                        <p className="text-xs font-bold text-amber-500">Demandes de capitanat</p>
                        {captainRequests.map(m => (
                            <div key={m.id} className="flex items-center justify-between">
                                <span className="text-xs text-foreground">{m.player_name} — {teams.find(t => t.id === m.team_id)?.name}</span>
                                <div className="flex gap-1">
                                    <button onClick={() => acceptCaptaincyRequest(m.id, m.team_id, m.user_id).then(() => { getTeams(id!).then(setTeams); getMembers(id!).then(setMembers); toast.success('Capitanat transféré'); })} className="p-1 rounded-lg bg-emerald-500/15 text-emerald-500"><CheckCircle size={14} /></button>
                                    <button onClick={() => leaveTeam(m.id).then(() => setMembers(p => p.filter(x => x.id !== m.id)))} className="p-1 rounded-lg bg-destructive/15 text-destructive"><XCircle size={14} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </header>

            <nav className="flex border-b border-border">
                {([['teams', 'Équipes'], ['matches', 'Matchs'], ['results', 'Résultats']] as [Tab, string][]).map(([key, label]) => (
                    <button key={key} onClick={() => setTab(key)}
                        className={`flex-1 py-3 text-sm font-semibold transition-all ${tab === key ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
                        {label}
                    </button>
                ))}
            </nav>

            <main className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-3">
                {tab === 'teams' && (
                    teams.length === 0
                        ? <div className="text-center py-12 text-muted-foreground text-sm">Aucune équipe inscrite</div>
                        : teams.map(team => {
                            const tm = members.filter(m => m.team_id === team.id);
                            return (
                                <div key={team.id} className="bg-card border border-border rounded-2xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Crown size={14} className={team.captain_id === userId ? 'text-amber-400' : 'text-muted-foreground/30'} />
                                            <p className="font-bold text-foreground">{team.name}</p>
                                            <span className="text-xs text-muted-foreground">({tm.length})</span>
                                        </div>
                                        {isAdmin && <button onClick={() => deleteTeam(team.id).then(() => setTeams(p => p.filter(t => t.id !== team.id)))} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 size={13} /></button>}
                                    </div>
                                    {tm.map(m => (
                                        <div key={m.id} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                            {m.user_id === team.captain_id && <Crown size={10} className="text-amber-400" />}
                                            {m.player_name ?? 'Joueur'}
                                            {m.role === 'captain_request' && <span className="text-[9px] bg-amber-500/15 text-amber-500 px-1.5 rounded-full font-bold ml-1">Cap. request</span>}
                                        </div>
                                    ))}
                                </div>
                            );
                        })
                )}

                {tab === 'matches' && (
                    matches.length === 0
                        ? <div className="text-center py-12 text-muted-foreground text-sm">Aucun match planifié</div>
                        : matches.map(match => {
                            const blue = teams.find(t => t.id === match.team_blue_id);
                            const red = teams.find(t => t.id === match.team_red_id);
                            const isLocked = match.status === 'locked';
                            const bw = (match.score_blue ?? []).filter((s, i) => s > (match.score_red?.[i] ?? 0)).length;
                            const rw = (match.score_red ?? []).filter((s, i) => s > (match.score_blue?.[i] ?? 0)).length;
                            const canEdit = isAdmin || (!isLocked && !tournament.strict_validation && myMembership);
                            const open = expandedMatch === match.id;
                            return (
                                <div key={match.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                                    <button onClick={() => setExpandedMatch(open ? null : match.id)} className="w-full p-4">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">{match.match_ref}</span>
                                            {isLocked && <Lock size={10} className="text-amber-400" />}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`flex-1 text-right font-bold text-sm truncate ${match.winner_id === match.team_blue_id ? 'text-emerald-500' : ''}`}>{blue?.name ?? '?'}</span>
                                            <span className="font-black text-sm">{bw} — {rw}</span>
                                            <span className={`flex-1 text-left font-bold text-sm truncate ${match.winner_id === match.team_red_id ? 'text-emerald-500' : ''}`}>{red?.name ?? '?'}</span>
                                        </div>
                                    </button>
                                    {open && (
                                        <div className="border-t border-border/50 p-4 space-y-3">
                                            {canEdit
                                                ? <ScoreEditor match={match} teams={teams} setsToWin={tournament.sets_to_win} onSave={(sb, sr, wid) => handleSaveScore(match, sb, sr, wid)} />
                                                : <p className="text-center text-sm text-muted-foreground">Lecture seule</p>
                                            }
                                            {isAdmin && (
                                                <div className="flex gap-2">
                                                    {!isLocked && <button onClick={() => lockMatch(match.id).then(() => setMatches(p => p.map(m => m.id === match.id ? { ...m, status: 'locked' } : m)))} className="flex-1 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground flex items-center justify-center gap-1"><Lock size={12} /> Verrouiller</button>}
                                                    <button onClick={() => deleteMatch(match.id).then(() => setMatches(p => p.filter(m => m.id !== match.id)))} className="flex-1 py-2 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold flex items-center justify-center gap-1"><Trash2 size={12} /> Supprimer</button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                )}

                {tab === 'results' && (
                    teams.map(team => {
                        const tm = matches.filter(m => m.team_blue_id === team.id || m.team_red_id === team.id);
                        const w = tm.filter(m => m.winner_id === team.id).length;
                        const d = tm.filter(m => m.winner_id && m.winner_id !== team.id).length;
                        return { team, w, d, p: tm.length };
                    }).sort((a, b) => b.w - a.w).map(({ team, w, d, p }, i) => (
                        <div key={team.id} className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3">
                            <span className="text-lg font-black w-7 text-center">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                            <div className="flex-1">
                                <p className="font-bold text-foreground text-sm">{team.name}</p>
                                <p className="text-xs text-muted-foreground">{p} matchs</p>
                            </div>
                            <div className="flex gap-2 text-xs font-bold">
                                <span className="text-emerald-500">{w}V</span>
                                <span className="text-destructive">{d}D</span>
                            </div>
                        </div>
                    ))
                )}
            </main>

            <Dialog open={showQR !== null} onOpenChange={() => setShowQR(null)}>
                <DialogContent className="max-w-sm rounded-2xl">
                    <DialogHeader><DialogTitle className="text-center font-black">{showQR === 'join' ? 'QR Inscription' : 'QR Spectateurs'}</DialogTitle></DialogHeader>
                    <div className="flex flex-col items-center gap-4 py-2">
                        <div className="p-4 bg-white rounded-2xl">
                            <QRCodeSVG value={showQR === 'join' ? joinUrl : spectateUrl} size={200} />
                        </div>
                        <p className="text-xs text-muted-foreground text-center break-all px-2">{showQR === 'join' ? joinUrl : spectateUrl}</p>
                        <button onClick={() => copy(showQR === 'join' ? joinUrl : spectateUrl)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm w-full justify-center">
                            <Copy size={14} /> Copier le lien
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showCreateMatch} onOpenChange={setShowCreateMatch}>
                <DialogContent className="max-w-sm rounded-2xl">
                    <DialogHeader><DialogTitle className="text-center font-black">Nouveau match</DialogTitle></DialogHeader>
                    <div className="space-y-3 pt-2">
                        <select value={matchBlueId} onChange={e => setMatchBlueId(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
                            <option value="">Équipe A (bleue)…</option>
                            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <select value={matchRedId} onChange={e => setMatchRedId(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
                            <option value="">Équipe B (rouge)…</option>
                            {teams.filter(t => t.id !== matchBlueId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <input type="number" min={1} value={matchRound} onChange={e => setMatchRound(Number(e.target.value))} placeholder="Round" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
                        <button onClick={handleCreateMatch} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm">Créer le match</button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
