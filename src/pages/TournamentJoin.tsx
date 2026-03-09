import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Loader2, Users, Trophy, UserPlus, LogIn } from 'lucide-react';
import {
    getTournamentByJoinToken, getTeams, getMembers,
    createTeam, joinTeam, requestCaptaincy
} from '@/lib/tournamentStorage';
import type { Tournament, TournamentTeam, TournamentMember } from '@/types/tournament';
import { toast } from 'sonner';

export default function TournamentJoin() {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token') ?? '';

    const [loading, setLoading] = useState(true);
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [teams, setTeams] = useState<TournamentTeam[]>([]);
    const [members, setMembers] = useState<TournamentMember[]>([]);
    const [user, setUser] = useState<any>(null);
    const [playerName, setPlayerName] = useState('');

    // UI state
    const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
    const [newTeamName, setNewTeamName] = useState('');
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [saving, setSaving] = useState(false);

    const myMembership = members.find(m => m.user_id === user?.id);

    useEffect(() => {
        if (!token) { setLoading(false); return; }
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user);
            if (user) {
                setPlayerName(user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? '');
            }
        });
        getTournamentByJoinToken(token).then(async t => {
            if (!t) { setLoading(false); return; }
            setTournament(t);
            const [tm, mb] = await Promise.all([getTeams(t.id), getMembers(t.id)]);
            setTeams(tm);
            setMembers(mb);
            setLoading(false);
        });
    }, [token]);

    const handleCreateTeam = async () => {
        if (!tournament || !user || !newTeamName.trim() || !playerName.trim()) return;
        setSaving(true);
        const team = await createTeam(tournament.id, newTeamName.trim());
        if (!team) { toast.error('Erreur lors de la création de l\'équipe'); setSaving(false); return; }
        // Join as captain (already set as captain in createTeam)
        await joinTeam(team.id, tournament.id, playerName.trim());
        toast.success(`Équipe "${team.name}" créée ! Tu en es capitaine.`);
        navigate(`/tournaments/${tournament.id}`);
    };

    const handleJoinTeam = async () => {
        if (!tournament || !user || !selectedTeamId || !playerName.trim()) return;
        setSaving(true);
        const membership = await joinTeam(selectedTeamId, tournament.id, playerName.trim());
        if (!membership) { toast.error('Impossible de rejoindre l\'équipe'); setSaving(false); return; }
        toast.success('Tu as rejoint l\'équipe !');
        navigate(`/tournaments/${tournament.id}`);
    };

    const handleRequestCaptaincy = async () => {
        if (!myMembership) return;
        const ok = await requestCaptaincy(myMembership.id);
        if (ok) toast.success('Demande de capitanat envoyée !');
    };

    if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>;

    if (!tournament) return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
            <Trophy size={40} className="text-muted-foreground" />
            <p className="font-bold text-foreground">Lien d'inscription invalide</p>
            <p className="text-sm text-muted-foreground">Ce tournoi n'existe pas ou le lien a expiré.</p>
            <button onClick={() => navigate('/')} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">Accueil</button>
        </div>
    );

    if (!user) return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
            <Trophy size={40} className="text-primary" />
            <h1 className="text-xl font-black text-foreground">{tournament.name}</h1>
            <p className="text-sm text-muted-foreground">Connecte-toi pour rejoindre ce tournoi.</p>
            <button onClick={() => navigate('/')} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">Se connecter</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="px-4 pt-safe-top py-3 border-b border-border flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-1.5 rounded-full bg-secondary text-muted-foreground"><ArrowLeft size={18} /></button>
                <div className="flex-1">
                    <h1 className="font-black text-foreground text-base truncate">{tournament.name}</h1>
                    <p className="text-xs text-muted-foreground">Rejoindre le tournoi</p>
                </div>
            </header>

            <main className="flex-1 p-4 max-w-md mx-auto w-full space-y-4">
                {myMembership ? (
                    <div className="space-y-4">
                        <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
                            <p className="text-sm font-bold text-emerald-500 mb-1">Tu es déjà inscrit !</p>
                            <p className="text-sm text-foreground">Équipe : <span className="font-bold">{teams.find(t => t.id === myMembership.team_id)?.name}</span></p>
                        </div>
                        {myMembership.role !== 'captain_request' && teams.find(t => t.id === myMembership.team_id)?.captain_id !== user.id && (
                            <button onClick={handleRequestCaptaincy} className="w-full py-3 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-secondary transition-colors">
                                Demander le capitanat
                            </button>
                        )}
                        <button onClick={() => navigate(`/tournaments/${tournament.id}`)} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm">
                            Voir le tournoi →
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Player name */}
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ton nom de joueur</label>
                            <input
                                value={playerName}
                                onChange={e => setPlayerName(e.target.value)}
                                placeholder="Ex: Jean Dupont"
                                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>

                        {mode === 'choose' && (
                            <div className="space-y-3">
                                <p className="text-sm font-semibold text-muted-foreground text-center">Comment veux-tu participer ?</p>
                                <button onClick={() => setMode('create')} className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-primary/30 bg-primary/5 hover:border-primary/60 transition-colors text-left">
                                    <UserPlus size={20} className="text-primary shrink-0" />
                                    <div>
                                        <p className="font-bold text-foreground text-sm">Créer une équipe</p>
                                        <p className="text-xs text-muted-foreground">Tu seras le capitaine</p>
                                    </div>
                                </button>
                                <button onClick={() => setMode('join')} disabled={teams.length === 0} className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-border hover:border-primary/30 transition-colors text-left disabled:opacity-40">
                                    <LogIn size={20} className="text-muted-foreground shrink-0" />
                                    <div>
                                        <p className="font-bold text-foreground text-sm">Rejoindre une équipe</p>
                                        <p className="text-xs text-muted-foreground">{teams.length} équipe{teams.length > 1 ? 's' : ''} disponible{teams.length > 1 ? 's' : ''}</p>
                                    </div>
                                </button>
                            </div>
                        )}

                        {mode === 'create' && (
                            <div className="space-y-3">
                                <button onClick={() => setMode('choose')} className="text-xs text-muted-foreground hover:text-foreground">← Retour</button>
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nom de l'équipe</label>
                                    <input
                                        value={newTeamName}
                                        onChange={e => setNewTeamName(e.target.value)}
                                        placeholder="Ex: Les Tornades"
                                        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>
                                <button onClick={handleCreateTeam} disabled={!newTeamName.trim() || !playerName.trim() || saving}
                                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                                    Créer l'équipe
                                </button>
                            </div>
                        )}

                        {mode === 'join' && (
                            <div className="space-y-3">
                                <button onClick={() => setMode('choose')} className="text-xs text-muted-foreground hover:text-foreground">← Retour</button>
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Choisir une équipe</label>
                                    <div className="mt-2 space-y-2">
                                        {teams.map(team => {
                                            const count = members.filter(m => m.team_id === team.id).length;
                                            return (
                                                <button
                                                    key={team.id}
                                                    onClick={() => setSelectedTeamId(team.id)}
                                                    className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-colors text-left ${selectedTeamId === team.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Users size={15} className="text-muted-foreground" />
                                                        <span className="font-semibold text-sm text-foreground">{team.name}</span>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">{count} joueur{count > 1 ? 's' : ''}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <button onClick={handleJoinTeam} disabled={!selectedTeamId || !playerName.trim() || saving}
                                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                                    Rejoindre l'équipe
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
