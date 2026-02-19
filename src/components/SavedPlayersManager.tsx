import { useState, useEffect, useCallback } from 'react';
import { X, Pencil, Check, Trash2, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SportType } from '@/types/sports';
import { getSavedPlayers, removeSavedPlayer } from '@/lib/savedPlayers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SavedPlayersManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

interface SavedPlayer {
  id: string;
  number: string;
  name: string;
  sport: SportType;
}

interface PlayerWithStats extends SavedPlayer {
  totalPoints: number;
  totalFaults: number;
  matchCount: number;
}

export function SavedPlayersManager({ open, onOpenChange, userId }: SavedPlayersManagerProps) {
  const [sport, setSport] = useState<SportType>('volleyball');
  const [players, setPlayers] = useState<PlayerWithStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadPlayers = useCallback(async () => {
    setLoading(true);
    const saved = await getSavedPlayers(sport, userId);

    // Fetch cumulative stats from all matches
    const { data: matches } = await supabase
      .from('matches')
      .select('match_data')
      .eq('user_id', userId);

    const statsMap = new Map<string, { points: number; faults: number; matches: Set<string> }>();

    if (matches) {
      for (const row of matches) {
        const matchData = row.match_data as any;
        if (!matchData || (matchData.sport || 'volleyball') !== sport) continue;
        const matchPlayers: { id: string; number: string; name: string }[] = matchData.players || [];
        const allPoints = [
          ...(matchData.completedSets || []).flatMap((s: any) => s.points || []),
          ...(matchData.points || []),
        ];

        for (const mp of matchPlayers) {
          // Find matching saved player by number+name
          const sp = saved.find(s => s.number === mp.number && s.name === mp.name);
          if (!sp) continue;
          
          if (!statsMap.has(sp.id)) {
            statsMap.set(sp.id, { points: 0, faults: 0, matches: new Set() });
          }
          const stat = statsMap.get(sp.id)!;
          stat.matches.add(matchData.id);

          for (const pt of allPoints) {
            if (pt.playerId === mp.id) {
              if (pt.type === 'scored') stat.points += (pt.pointValue ?? 1);
              if (pt.type === 'fault') stat.faults++;
            }
          }
        }
      }
    }

    const playersWithStats: PlayerWithStats[] = saved.map(sp => {
      const stat = statsMap.get(sp.id);
      return {
        ...sp,
        sport,
        totalPoints: stat?.points ?? 0,
        totalFaults: stat?.faults ?? 0,
        matchCount: stat?.matches.size ?? 0,
      };
    });

    setPlayers(playersWithStats);
    setLoading(false);
  }, [sport, userId]);

  useEffect(() => {
    if (open) loadPlayers();
  }, [open, loadPlayers]);

  const handleDelete = async (id: string) => {
    await removeSavedPlayer(id, sport, userId);
    setDeletingId(null);
    loadPlayers();
    toast.success('Joueur supprimé');
  };

  const handleSaveName = async (id: string) => {
    if (!editName.trim()) return;
    const { error } = await supabase
      .from('saved_players')
      .update({ name: editName.trim() })
      .eq('id', id);
    if (error) { toast.error('Erreur lors de la modification'); return; }
    setEditingId(null);
    loadPlayers();
    toast.success('Nom modifié');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-bold">
            <Users size={18} className="inline mr-2" />
            Joueurs enregistrés
          </DialogTitle>
        </DialogHeader>

        {/* Sport tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setSport('volleyball')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all border-2 ${
              sport === 'volleyball'
                ? 'bg-primary/15 text-primary border-primary/40'
                : 'bg-secondary text-secondary-foreground border-transparent hover:bg-secondary/80'
            }`}
          >
            🏐 Volley
          </button>
          <button
            onClick={() => setSport('basketball')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all border-2 ${
              sport === 'basketball'
                ? 'bg-orange-500/15 text-orange-500 border-orange-500/40'
                : 'bg-secondary text-secondary-foreground border-transparent hover:bg-secondary/80'
            }`}
          >
            🏀 Basket
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Chargement…</p>
        ) : players.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Aucun joueur enregistré pour ce sport.</p>
        ) : (
          <div className="space-y-2">
            {players.map(p => (
              <div key={p.id} className="bg-secondary/50 rounded-xl px-3 py-2.5 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-team-blue">{p.name || p.number}</span>
                  {editingId === p.id ? (
                    <>
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="h-7 flex-1 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="Nom"
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveName(p.id); }}
                        autoFocus
                      />
                      <button onClick={() => handleSaveName(p.id)} className="p-1 text-primary"><Check size={14} /></button>
                      <button onClick={() => setEditingId(null)} className="p-1 text-muted-foreground"><X size={14} /></button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium text-foreground truncate">{p.name || '—'}</span>
                      <button onClick={() => { setEditingId(p.id); setEditName(p.name); }} className="p-1 text-muted-foreground hover:text-foreground"><Pencil size={13} /></button>
                      <button onClick={() => setDeletingId(p.id)} className="p-1 text-destructive/60 hover:text-destructive"><Trash2 size={13} /></button>
                    </>
                  )}
                </div>
                <div className="flex gap-3 text-[11px] text-muted-foreground pl-11">
                  <span>{p.matchCount} match{p.matchCount > 1 ? 's' : ''}</span>
                  <span>⚡ {p.totalPoints} pts</span>
                  <span>❌ {p.totalFaults} fautes</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete confirm */}
        {deletingId && (
          <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" onClick={() => setDeletingId(null)}>
            <div className="bg-card rounded-2xl p-5 max-w-xs w-full border border-border space-y-3" onClick={e => e.stopPropagation()}>
              <p className="text-sm font-bold text-foreground text-center">Supprimer ce joueur ?</p>
              <div className="flex gap-2">
                <button onClick={() => setDeletingId(null)} className="flex-1 py-2 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm">Annuler</button>
                <button onClick={() => handleDelete(deletingId)} className="flex-1 py-2 rounded-lg bg-destructive text-destructive-foreground font-semibold text-sm">Supprimer</button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
