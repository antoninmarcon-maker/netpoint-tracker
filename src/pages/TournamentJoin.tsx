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
import { useTranslation } from 'react-i18next';

export default function TournamentJoin() {
    const { t } = useTranslation();
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
        getTournamentByJoinToken(token).then(async tournament => {
            if (!tournament) { toast.error(t('tournaments.invalidLink') || 'Lien invalide'); setLoading(false); return; }
            setTournament(tournament);
            const [tm, mb] = await Promise.all([getTeams(tournament.id), getMembers(tournament.id)]);
            setTeams(tm);
            setMembers(mb);
            setLoading(false);
        }).catch(err => { console.error(err); toast.error(t('common.error') || 'Erreur'); setLoading(false); });
    }, [token]);

    const handleCreateTeam = async () => {
        if (!tournament || !user || !newTeamName.trim() || !playerName.trim()) return;
        setSaving(true);
        try {
            const team = await createTeam(tournament.id, newTeamName.trim());
            if (!team) { toast.error(t('tournaments.creationError')); setSaving(false); return; }
            await joinTeam(team.id, tournament.id, playerName.trim());
            toast.success(t('tournaments.teamCreated', { name: team.name }));
            navigate(`/tournaments/${tournament.id}`);
        } catch (err) {
            console.error(err);
            toast.error(t('common.error') || 'Erreur');
            setSaving(false);
        }
    };

    const handleJoinTeam = async () => {
        if (!tournament || !user || !selectedTeamId || !playerName.trim()) return;
        setSaving(true);
        try {
            const membership = await joinTeam(selectedTeamId, tournament.id, playerName.trim());
            if (!membership) { toast.error(t('tournaments.joiningError')); setSaving(false); return; }
            toast.success(t('tournaments.joinedSuccess'));
            navigate(`/tournaments/${tournament.id}`);
        } catch (err) {
            console.error(err);
            toast.error(t('common.error') || 'Erreur');
            setSaving(false);
        }
    };

    const handleRequestCaptaincy = async () => {
        if (!myMembership) return;
        const ok = await requestCaptaincy(myMembership.id);
        if (ok) toast.success(t('tournaments.captainRequestSent'));
    };

    if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>;

    if (!tournament) return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
            <Trophy size={40} className="text-muted-foreground" />
            <p className="font-bold text-foreground">{t('tournaments.invalidLink')}</p>
            <p className="text-sm text-muted-foreground">{t('tournaments.linkExpired')}</p>
            <button onClick={() => navigate('/')} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">{t('shared.home')}</button>
        </div>
    );

    if (!user) return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
            <Trophy size={40} className="text-muted-foreground" />
            <h1 className="text-xl font-black text-foreground">{tournament.name}</h1>
            <p className="text-sm text-muted-foreground">{t('tournaments.loginToJoin')}</p>
            <button onClick={() => navigate('/')} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">{t('common.login')}</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-background flex flex-col pb-20">
            <header className="px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] border-b border-border flex items-center gap-3 sticky top-0 bg-background z-40">
                <button onClick={() => navigate('/tournaments')} className="p-1.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground">
                    <ArrowLeft size={18} />
                </button>
                <div className="flex-1">
                    <h1 className="font-black text-foreground text-base truncate">{tournament.name}</h1>
                    <p className="text-xs text-muted-foreground">{t('tournaments.join')}</p>
                </div>
            </header>

            <main className="flex-1 p-4 max-w-md mx-auto w-full space-y-4">
                {myMembership ? (
                    <div className="space-y-4">
                        <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
                            <p className="text-sm font-bold text-emerald-500 mb-1">{t('tournaments.alreadyRegistered')}</p>
                            <p className="text-sm text-foreground">{t('tournaments.team')} : <span className="font-bold">{teams.find(t => t.id === myMembership.team_id)?.name}</span></p>
                        </div>
                        {myMembership.role !== 'captain_request' && teams.find(t => t.id === myMembership.team_id)?.captain_id !== user.id && (
                            <button onClick={handleRequestCaptaincy} className="w-full py-3 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-secondary transition-colors">
                                {t('tournaments.requestCaptaincy')}
                            </button>
                        )}
                        <button onClick={() => navigate(`/tournaments/${tournament.id}`)} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm">
                            {t('tournaments.viewTournament')}
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Player name */}
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('tournaments.playerNameLabel')}</label>
                            <input
                                value={playerName}
                                onChange={e => setPlayerName(e.target.value)}
                                placeholder={t('tournaments.playerNamePlaceholder')}
                                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>

                        {mode === 'choose' && (
                            <div className="space-y-3">
                                <p className="text-sm font-semibold text-muted-foreground text-center">{t('tournaments.howToParticipate')}</p>
                                <button onClick={() => setMode('create')} className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-primary/30 bg-primary/5 hover:border-primary/60 transition-colors text-left">
                                    <UserPlus size={20} className="text-muted-foreground shrink-0" />
                                    <div>
                                        <p className="font-bold text-foreground text-sm">{t('tournaments.createTeam')}</p>
                                        <p className="text-xs text-muted-foreground">{t('tournaments.youWillBeCaptain')}</p>
                                    </div>
                                </button>
                                <button onClick={() => setMode('join')} disabled={teams.length === 0} className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-border hover:border-primary/30 transition-colors text-left disabled:opacity-40">
                                    <LogIn size={20} className="text-muted-foreground shrink-0" />
                                    <div>
                                        <p className="font-bold text-foreground text-sm">{t('tournaments.joinTeam')}</p>
                                        <p className="text-xs text-muted-foreground">{t('tournaments.teamsAvailable', { count: teams.length })}</p>
                                    </div>
                                </button>
                            </div>
                        )}

                        {mode === 'create' && (
                            <div className="space-y-3">
                                <button onClick={() => setMode('choose')} className="text-xs text-muted-foreground hover:text-foreground">← {t('common.back')}</button>
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('tournaments.teamNameLabel')}</label>
                                    <input
                                        value={newTeamName}
                                        onChange={e => setNewTeamName(e.target.value)}
                                        placeholder={t('tournaments.teamNamePlaceholder')}
                                        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>
                                <button onClick={handleCreateTeam} disabled={!newTeamName.trim() || !playerName.trim() || saving}
                                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                                    {t('tournaments.createTeamAction')}
                                </button>
                            </div>
                        )}

                        {mode === 'join' && (
                            <div className="space-y-3">
                                <button onClick={() => setMode('choose')} className="text-xs text-muted-foreground hover:text-foreground">← {t('common.back')}</button>
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('tournaments.chooseTeam')}</label>
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
                                                    <span className="text-xs text-muted-foreground">{t('tournaments.playerCount', { count })}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <button onClick={handleJoinTeam} disabled={!selectedTeamId || !playerName.trim() || saving}
                                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                                    {t('tournaments.joinAction')}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
