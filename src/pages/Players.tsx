import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Plus, X, Pencil, Check, Trash2, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { SportType, getScoredActionsForSport, getFaultActionsForSport } from '@/types/sports';
import {
  getSavedPlayers, removeSavedPlayer, addSavedPlayer,
  updateSavedPlayerName, updateSavedPlayerNumber,
  getJerseyConfig, setJerseyEnabled,
  getPlayerNumber, getPlayerNumbers,
  type SavedPlayer,
} from '@/lib/savedPlayers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';

interface PlayerWithStats extends SavedPlayer {
  totalPoints: number;
  totalFaults: number;
  matchCount: number;
  actionDetails: Record<string, number>;
}

export default function Players() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const sport: SportType = 'volleyball';
  const [players, setPlayers] = useState<PlayerWithStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [jerseyConfig, setJerseyConfig] = useState(getJerseyConfig);
  const [playerNumbers, setPlayerNumbers] = useState<Record<string, string>>(getPlayerNumbers);

  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const loadPlayers = useCallback(async () => {
    setLoading(true);
    const userId = user?.id;
    const saved = await getSavedPlayers(sport, userId);
    const numbers = getPlayerNumbers();
    setPlayerNumbers(numbers);

    if (userId) {
      const { data: matches } = await supabase
        .from('matches')
        .select('match_data')
        .eq('user_id', userId);

      const statsMap = new Map<string, { points: number; faults: number; matches: Set<string>; actions: Record<string, number> }>();

      if (matches) {
        for (const row of matches) {
          const matchData = row.match_data as any;
          if (!matchData || (matchData.sport || 'volleyball') !== sport) continue;
          const matchPlayers: { id: string; name: string }[] = matchData.players || [];
          const allPoints = [
            ...(matchData.completedSets || []).flatMap((s: any) => s.points || []),
            ...(matchData.points || []),
          ];

          for (const mp of matchPlayers) {
            const sp = saved.find(s => s.name === mp.name);
            if (!sp) continue;
            if (!statsMap.has(sp.id)) {
              statsMap.set(sp.id, { points: 0, faults: 0, matches: new Set(), actions: {} });
            }
            const stat = statsMap.get(sp.id)!;
            stat.matches.add(matchData.id);
            for (const pt of allPoints) {
              if (pt.playerId === mp.id) {
                if (pt.type === 'scored') stat.points += (pt.pointValue ?? 1);
                if (pt.type === 'fault') stat.faults++;
                const actionKey = pt.action as string;
                stat.actions[actionKey] = (stat.actions[actionKey] ?? 0) + 1;
              }
            }
          }
        }
      }

      setPlayers(saved.map(sp => {
        const stat = statsMap.get(sp.id);
        return {
          ...sp,
          number: numbers[sp.id],
          totalPoints: stat?.points ?? 0,
          totalFaults: stat?.faults ?? 0,
          matchCount: stat?.matches.size ?? 0,
          actionDetails: stat?.actions ?? {},
        };
      }));
    } else {
      setPlayers(saved.map(sp => ({
        ...sp,
        number: numbers[sp.id],
        totalPoints: 0,
        totalFaults: 0,
        matchCount: 0,
        actionDetails: {},
      })));
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

  const jerseyEnabled = jerseyConfig[sport];

  const handleToggleJersey = (enabled: boolean) => {
    const newConfig = setJerseyEnabled(sport, enabled);
    setJerseyConfig({ ...newConfig });
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await addSavedPlayer(newName, sport, user?.id, jerseyEnabled ? newNumber : undefined);
    setNewName('');
    setNewNumber('');
    loadPlayers();
    toast.success(t('players.playerAdded'));
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    await updateSavedPlayerName(id, editName, sport, user?.id);
    if (jerseyEnabled) {
      await updateSavedPlayerNumber(id, editNumber, user?.id);
    }
    setEditingId(null);
    loadPlayers();
    toast.success(t('savedPlayers.nameChanged'));
  };

  const handleDelete = async (id: string) => {
    await removeSavedPlayer(id, sport, user?.id);
    setDeletingId(null);
    loadPlayers();
    toast.success(t('savedPlayers.playerDeleted'));
  };

  const scoredActions = getScoredActionsForSport(sport);
  const faultActions = getFaultActionsForSport(sport);

  const renderActionDetails = (p: PlayerWithStats) => {
    const hasAny = Object.keys(p.actionDetails).length > 0;
    if (!hasAny) return <p className="text-[11px] text-muted-foreground py-2">{t('players.noStats')}</p>;

    const scoredEntries = scoredActions.filter(a => p.actionDetails[a.key]);
    const faultEntries = faultActions.filter(a => p.actionDetails[a.key]);

    return (
      <div className="space-y-2 pt-1">
        {scoredEntries.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-action-scored uppercase tracking-wider mb-1">⚡ {t('savedPlayers.scored')}</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              {scoredEntries.map(a => (
                <div key={a.key} className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">{t(`actions.${a.key}`, a.label)}</span>
                  <span className="font-bold text-foreground tabular-nums">{p.actionDetails[a.key]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {faultEntries.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-action-fault uppercase tracking-wider mb-1">❌ {t('savedPlayers.faultsCategory')}</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              {faultEntries.map(a => (
                <div key={a.key} className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">{t(`actions.${a.key}`, a.label)}</span>
                  <span className="font-bold text-foreground tabular-nums">{p.actionDetails[a.key]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] border-b border-border flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={18} />
        </button>
        <Users size={18} className="text-primary" />
        <h1 className="text-lg font-bold text-foreground">{t('players.title')}</h1>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-4">
        {/* Jersey number toggle */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-foreground">{t('players.useJerseyNumbers')}</Label>
            <Switch checked={jerseyEnabled} onCheckedChange={handleToggleJersey} />
          </div>

          {jerseyEnabled && (
            <Alert className="border-primary/20 bg-primary/5">
              <Info size={16} className="text-primary" />
              <AlertTitle className="text-sm font-bold">{t('players.jerseyNumbersInfoTitle')}</AlertTitle>
              <AlertDescription className="text-xs text-muted-foreground">
                {t('players.jerseyNumbersInfoDesc')}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Add player form */}
        <div className="flex gap-2">
          {jerseyEnabled && (
            <Input
              value={newNumber}
              onChange={e => setNewNumber(e.target.value.slice(0, 3))}
              placeholder={t('players.jerseyNumberPlaceholder')}
              className="h-9 text-sm w-14 text-center font-bold"
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
          )}
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder={t('roster.playerNamePlaceholder')}
            className="h-9 text-sm flex-1"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="px-3 h-9 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-30 transition-all"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Player list */}
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">{t('savedPlayers.loading')}</p>
        ) : players.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">{t('savedPlayers.noPlayers')}</p>
        ) : (
          <div className="space-y-2">
            {players.map(p => (
              <div key={p.id} className="bg-secondary/50 rounded-xl px-3 py-2.5 space-y-1">
                <div className="flex items-center gap-2">
                  {user && (
                    <button
                      onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                      className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {expandedId === p.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  )}

                  {editingId === p.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      {jerseyEnabled && (
                        <Input
                          value={editNumber}
                          onChange={e => setEditNumber(e.target.value.slice(0, 3))}
                          placeholder={t('players.jerseyNumberPlaceholder')}
                          className="h-7 w-12 text-xs text-center font-bold"
                          onKeyDown={e => e.key === 'Enter' && handleSaveEdit(p.id)}
                        />
                      )}
                      <Input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="h-7 flex-1 text-xs"
                        placeholder="Nom"
                        onKeyDown={e => e.key === 'Enter' && handleSaveEdit(p.id)}
                        autoFocus
                      />
                      <button onClick={() => handleSaveEdit(p.id)} className="p-1 text-primary"><Check size={14} /></button>
                      <button onClick={() => setEditingId(null)} className="p-1 text-muted-foreground"><X size={14} /></button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {jerseyEnabled && playerNumbers[p.id] && (
                          <Badge variant="outline" className="rounded-full w-8 h-8 flex items-center justify-center text-xs font-black border-primary/30 text-primary bg-primary/10 shrink-0">
                            {playerNumbers[p.id]}
                          </Badge>
                        )}
                        <span className="text-sm font-medium text-foreground truncate">{p.name || '—'}</span>
                      </div>
                      <button onClick={() => { setEditingId(p.id); setEditName(p.name); setEditNumber(playerNumbers[p.id] || ''); }} className="p-1 text-muted-foreground hover:text-foreground"><Pencil size={13} /></button>
                      <button onClick={() => setDeletingId(p.id)} className="p-1 text-destructive/60 hover:text-destructive"><Trash2 size={13} /></button>
                    </>
                  )}
                </div>

                {user && editingId !== p.id && (
                  <div className="flex gap-3 text-[11px] text-muted-foreground pl-6">
                    <span>{p.matchCount} match{p.matchCount > 1 ? 's' : ''}</span>
                    <span>⚡ {p.totalPoints} {t('playerStats.pts')}</span>
                    <span>❌ {p.totalFaults} {t('savedPlayers.faults')}</span>
                  </div>
                )}

                {expandedId === p.id && (
                  <div className="pl-6 pt-1 border-t border-border/50 mt-1">
                    {renderActionDetails(p)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {deletingId && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" onClick={() => setDeletingId(null)}>
          <div className="bg-card rounded-2xl p-5 max-w-xs w-full border border-border space-y-3" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-bold text-foreground text-center">{t('savedPlayers.deletePlayer')}</p>
            <div className="flex gap-2">
              <button onClick={() => setDeletingId(null)} className="flex-1 py-2 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm">{t('common.cancel')}</button>
              <button onClick={() => handleDelete(deletingId)} className="flex-1 py-2 rounded-lg bg-destructive text-destructive-foreground font-semibold text-sm">{t('common.delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
