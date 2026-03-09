import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Plus, ArrowLeft, Calendar, MapPin, ChevronRight, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getMyTournaments, createTournament, deleteTournament } from '@/lib/tournamentStorage';
import type { Tournament, TournamentFormat } from '@/types/tournament';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

const FORMAT_LABELS: Record<TournamentFormat, string> = {
    pools: 'Poules',
    elimination: 'Élimination directe',
    championship: 'Championnat',
};

const STATUS_LABELS: Record<string, string> = {
    draft: 'Brouillon',
    open: 'Ouvert',
    in_progress: 'En cours',
    finished: 'Terminé',
};

const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    open: 'bg-emerald-500/15 text-emerald-500',
    in_progress: 'bg-amber-500/15 text-amber-500',
    finished: 'bg-muted text-muted-foreground',
};

export default function Tournaments() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);

    // Form state
    const [formName, setFormName] = useState('');
    const [formLocation, setFormLocation] = useState('');
    const [formDate, setFormDate] = useState('');
    const [formFormat, setFormFormat] = useState<TournamentFormat>('pools');
    const [formPointsPerSet, setFormPointsPerSet] = useState(25);
    const [formSetsToWin, setFormSetsToWin] = useState(2);
    const [formPublicReg, setFormPublicReg] = useState(true);
    const [formPlayerScoring, setFormPlayerScoring] = useState(false);
    const [formStrictValidation, setFormStrictValidation] = useState(false);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user);
            if (user) {
                getMyTournaments().then(data => {
                    setTournaments(data);
                    setLoading(false);
                });
            } else {
                setLoading(false);
            }
        });
    }, []);

    const handleCreate = async () => {
        if (!formName.trim()) return;
        setCreating(true);
        const tournament = await createTournament({
            name: formName.trim(),
            location: formLocation.trim() || undefined,
            date: formDate || undefined,
            format: formFormat,
            points_per_set: formPointsPerSet,
            sets_to_win: formSetsToWin,
            public_registration: formPublicReg,
            player_scoring: formPlayerScoring,
            strict_validation: formStrictValidation,
        });
        setCreating(false);
        if (tournament) {
            setShowCreate(false);
            navigate(`/tournaments/${tournament.id}`);
        } else {
            toast.error('Erreur lors de la création du tournoi');
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Supprimer ce tournoi ?')) return;
        const ok = await deleteTournament(id);
        if (ok) {
            setTournaments(prev => prev.filter(t => t.id !== id));
            toast.success('Tournoi supprimé');
        }
    };

    if (!user && !loading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6">
                <Trophy size={48} className="text-primary" />
                <h1 className="text-2xl font-black text-foreground">Tournois</h1>
                <p className="text-muted-foreground text-sm text-center">Connecte-toi pour créer et gérer tes tournois.</p>
                <button
                    onClick={() => navigate('/')}
                    className="mt-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
                >
                    Se connecter
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <header className="px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] border-b border-border flex items-center gap-3">
                <button onClick={() => navigate('/')} className="p-1.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft size={18} />
                </button>
                <div className="flex items-center gap-2 flex-1">
                    <Trophy size={20} className="text-primary" />
                    <h1 className="text-lg font-black text-foreground tracking-tight">Tournois</h1>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
                >
                    <Plus size={16} />
                    Créer
                </button>
            </header>

            {/* List */}
            <main className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-3">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="animate-spin text-primary" size={32} />
                    </div>
                ) : tournaments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <Trophy size={28} className="text-primary" />
                        </div>
                        <p className="text-base font-semibold text-foreground">Aucun tournoi pour l'instant</p>
                        <p className="text-sm text-muted-foreground">Crée ton premier tournoi pour commencer !</p>
                        <button
                            onClick={() => setShowCreate(true)}
                            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
                        >
                            Créer un tournoi
                        </button>
                    </div>
                ) : (
                    tournaments.map(t => (
                        <button
                            key={t.id}
                            onClick={() => navigate(`/tournaments/${t.id}`)}
                            className="w-full text-left bg-card border border-border rounded-2xl p-4 hover:border-primary/30 hover:bg-card/80 transition-all group"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[10px] font-bold uppercase rounded-full px-2 py-0.5 ${STATUS_COLORS[t.status]}`}>
                                            {STATUS_LABELS[t.status]}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">{FORMAT_LABELS[t.format]}</span>
                                    </div>
                                    <p className="font-bold text-foreground truncate text-base">{t.name}</p>
                                    <div className="flex items-center gap-3 mt-1.5">
                                        {t.location && (
                                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <MapPin size={11} /> {t.location}
                                            </span>
                                        )}
                                        {t.date && (
                                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Calendar size={11} /> {new Date(t.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={(e) => handleDelete(t.id, e)}
                                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                    <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary transition-colors mt-0.5" />
                                </div>
                            </div>
                        </button>
                    ))
                )}
            </main>

            {/* Create Dialog */}
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent className="max-w-sm rounded-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-center font-black flex items-center justify-center gap-2">
                            <Trophy size={18} className="text-primary" /> Nouveau tournoi
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        {/* Name */}
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nom *</label>
                            <input
                                value={formName}
                                onChange={e => setFormName(e.target.value)}
                                placeholder="Ex: Tournoi de printemps"
                                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                        {/* Location */}
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lieu</label>
                            <input
                                value={formLocation}
                                onChange={e => setFormLocation(e.target.value)}
                                placeholder="Ex: Gymnase Marcel Cerdan"
                                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                        {/* Date */}
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</label>
                            <input
                                type="date"
                                value={formDate}
                                onChange={e => setFormDate(e.target.value)}
                                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                        {/* Format */}
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Format</label>
                            <select
                                value={formFormat}
                                onChange={e => setFormFormat(e.target.value as TournamentFormat)}
                                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option value="pools">Poules</option>
                                <option value="elimination">Élimination directe</option>
                                <option value="championship">Championnat</option>
                            </select>
                        </div>
                        {/* Points per set */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Points par set</label>
                                <select
                                    value={formPointsPerSet}
                                    onChange={e => setFormPointsPerSet(Number(e.target.value))}
                                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value={15}>15</option>
                                    <option value={21}>21</option>
                                    <option value={25}>25</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sets gagnants</label>
                                <select
                                    value={formSetsToWin}
                                    onChange={e => setFormSetsToWin(Number(e.target.value))}
                                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value={1}>1</option>
                                    <option value={2}>2</option>
                                    <option value={3}>3</option>
                                </select>
                            </div>
                        </div>
                        {/* Toggles */}
                        <div className="space-y-3 rounded-xl border border-border p-3">
                            {[
                                { label: 'Inscriptions publiques', desc: 'Les joueurs peuvent s\'inscrire via un lien', val: formPublicReg, set: setFormPublicReg },
                                { label: 'Saisie de score par les joueurs', desc: 'Les joueurs peuvent entrer les scores', val: formPlayerScoring, set: setFormPlayerScoring },
                                { label: 'Validation stricte', desc: 'Seul l\'admin peut modifier après le début', val: formStrictValidation, set: setFormStrictValidation },
                            ].map(item => (
                                <div key={item.label} className="flex items-center justify-between gap-3">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                                    </div>
                                    <Switch checked={item.val} onCheckedChange={item.set} />
                                </div>
                            ))}
                        </div>
                        {/* CTA */}
                        <button
                            onClick={handleCreate}
                            disabled={!formName.trim() || creating}
                            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                        >
                            {creating ? <Loader2 size={16} className="animate-spin" /> : <Trophy size={16} />}
                            Créer le tournoi
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
