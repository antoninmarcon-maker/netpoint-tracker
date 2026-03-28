import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Plus, ChevronRight, Loader2, Trash2 } from 'lucide-react';
import { getMyTournaments, createTournament, deleteTournament } from '@/lib/tournamentStorage';
import type { Tournament, TournamentFormat } from '@/types/tournament';
import { useTranslation } from 'react-i18next';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';

const STATUS_COLORS: Record<string, string> = {
    draft: 'border-border bg-muted text-muted-foreground',
    open: 'border-action-scored/15 bg-action-scored/10 text-action-scored',
    in_progress: 'border-accent/20 bg-accent/10 text-accent',
    finished: 'border-border bg-muted text-muted-foreground',
};

export default function Tournaments() {
    const { t, i18n } = useTranslation();
    useDocumentMeta({ titleKey: 'meta.tournamentsTitle', descriptionKey: 'meta.tournamentsDesc', path: '/tournaments' });
    const { user, authLoaded, requireAuth } = useAuth();

    const getFormatLabel = (format: TournamentFormat) => {
        switch (format) {
            case 'elimination': return t('tournaments.formatElimination');
            case 'championship': return t('tournaments.formatChampionship');
            case 'pools':
            default: return t('tournaments.formatPools');
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'open': return t('tournaments.statusOpen');
            case 'in_progress': return t('tournaments.statusInProgress');
            case 'finished': return t('tournaments.statusFinished');
            case 'draft':
            default: return t('tournaments.statusDraft');
        }
    };
    const navigate = useNavigate();
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
        if (!authLoaded) return;
        if (user) {
            getMyTournaments().then(data => {
                setTournaments(data);
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    }, [authLoaded, user]);

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
            toast.error(t('tournaments.creationError'));
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(t('tournaments.deleteConfirm'))) return;
        const ok = await deleteTournament(id);
        if (ok) {
            setTournaments(prev => prev.filter(t => t.id !== id));
            toast.success(t('tournaments.deleted'));
        }
    };

    const handleCreateClick = () => {
        if (!requireAuth(t('tournaments.loginToManage'))) return;
        setShowCreate(true);
    };

    if (!user && !loading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Trophy size={28} className="text-muted-foreground" />
                </div>
                <h1 className="text-2xl font-black text-foreground">{t('tournaments.title')}</h1>
                <p className="text-sm text-muted-foreground">{t('tournaments.noTournaments')}</p>
                <button
                    onClick={handleCreateClick}
                    className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
                >
                    {t('tournaments.createButton')}
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Page actions */}
            <div className="px-4 pt-3 max-w-2xl mx-auto w-full flex justify-end">
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
                >
                    <Plus size={16} />
                    {t('tournaments.create')}
                </button>
            </div>

            {/* List */}
            <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="animate-spin text-primary" size={32} />
                    </div>
                ) : tournaments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <Trophy size={28} className="text-muted-foreground" />
                        </div>
                        <p className="text-base font-semibold text-foreground">{t('tournaments.noTournaments')}</p>
                        <p className="text-sm text-muted-foreground">{t('tournaments.createFirst')}</p>
                        <button
                            onClick={() => setShowCreate(true)}
                            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
                        >
                            {t('tournaments.createButton')}
                        </button>
                    </div>
                ) : (
                    <div className="rounded-[14px] border border-border bg-card p-5">
                        {tournaments.map(t => (
                            <button
                                key={t.id}
                                onClick={() => navigate(`/tournaments/${t.id}`)}
                                className="w-full text-left border-b border-border py-3.5 last:border-b-0 flex items-center gap-3 group"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                                        <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${STATUS_COLORS[t.status]}`}>
                                            {getStatusLabel(t.status)}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-border mt-0.5">
                                        {[
                                            t.location,
                                            t.date && new Date(t.date).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }),
                                            getFormatLabel(t.format),
                                        ].filter(Boolean).join(' \u00b7 ')}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => handleDelete(t.id, e)}
                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                                >
                                    <Trash2 size={15} />
                                </button>
                                <ChevronRight className="h-4 w-4 text-border shrink-0" />
                            </button>
                        ))}
                    </div>
                )}
            </main>

            {/* Create Dialog */}
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent className="max-w-sm rounded-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-center font-black flex items-center justify-center gap-2">
                            <Trophy size={18} className="text-muted-foreground" /> {t('tournaments.newTournament')}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        {/* Name */}
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('tournaments.nameLabel')}</label>
                            <input
                                value={formName}
                                onChange={e => setFormName(e.target.value)}
                                placeholder={t('tournaments.namePlaceholder')}
                                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                        {/* Location */}
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('tournaments.locationLabel')}</label>
                            <input
                                value={formLocation}
                                onChange={e => setFormLocation(e.target.value)}
                                placeholder={t('tournaments.locationPlaceholder')}
                                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                        {/* Date */}
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('tournaments.dateLabel')}</label>
                            <input
                                type="date"
                                value={formDate}
                                onChange={e => setFormDate(e.target.value)}
                                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                        {/* Format */}
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('tournaments.formatLabel')}</label>
                            <select
                                value={formFormat}
                                onChange={e => setFormFormat(e.target.value as TournamentFormat)}
                                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option value="pools">{t('tournaments.formatPools')}</option>
                                <option value="elimination">{t('tournaments.formatElimination')}</option>
                                <option value="championship">{t('tournaments.formatChampionship')}</option>
                            </select>
                        </div>
                        {/* Points per set */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('tournaments.pointsPerSetLabel')}</label>
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
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('tournaments.setsToWinLabel')}</label>
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
                                { label: t('tournaments.publicReg'), desc: t('tournaments.publicRegDesc'), val: formPublicReg, set: setFormPublicReg },
                                { label: t('tournaments.playerScoring'), desc: t('tournaments.playerScoringDesc'), val: formPlayerScoring, set: setFormPlayerScoring },
                                { label: t('tournaments.strictValidation'), desc: t('tournaments.strictValidationDesc'), val: formStrictValidation, set: setFormStrictValidation },
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
                            {t('tournaments.createAction')}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
