import { useState } from 'react';
import { Users, Plus, X, Pencil, Check } from 'lucide-react';
import { Player } from '@/types/volleyball';
import { Input } from '@/components/ui/input';

interface PlayerRosterProps {
  players: Player[];
  onSetPlayers: (players: Player[]) => void;
  teamName: string;
}

export function PlayerRoster({ players, onSetPlayers, teamName }: PlayerRosterProps) {
  const [open, setOpen] = useState(false);
  const [newNumber, setNewNumber] = useState('');
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNumber, setEditNumber] = useState('');
  const [editName, setEditName] = useState('');

  const addPlayer = () => {
    if (!newNumber.trim()) return;
    const player: Player = {
      id: crypto.randomUUID(),
      number: newNumber.trim(),
      name: newName.trim(),
    };
    onSetPlayers([...players, player]);
    setNewNumber('');
    setNewName('');
  };

  const removePlayer = (id: string) => {
    onSetPlayers(players.filter(p => p.id !== id));
  };

  const startEdit = (p: Player) => {
    setEditingId(p.id);
    setEditNumber(p.number);
    setEditName(p.name);
  };

  const saveEdit = () => {
    if (!editingId || !editNumber.trim()) return;
    onSetPlayers(players.map(p => p.id === editingId ? { ...p, number: editNumber.trim(), name: editName.trim() } : p));
    setEditingId(null);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg bg-team-blue/10 text-team-blue border border-team-blue/20 hover:bg-team-blue/20 transition-all"
      >
        <Users size={14} />
        {players.length > 0 ? `Roster ${teamName} (${players.length})` : `Définir le roster ${teamName}`}
      </button>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-team-blue flex items-center gap-1.5">
          <Users size={14} /> Roster {teamName}
        </p>
        <button onClick={() => setOpen(false)} className="p-1 rounded-md text-muted-foreground hover:text-foreground">
          <X size={16} />
        </button>
      </div>

      {/* Player list */}
      {players.length > 0 && (
        <div className="space-y-1">
          {players.map(p => (
            <div key={p.id} className="flex items-center gap-2 bg-secondary/50 rounded-lg px-2.5 py-1.5">
              {editingId === p.id ? (
                <>
                  <Input value={editNumber} onChange={e => setEditNumber(e.target.value)} className="h-7 w-14 text-xs" placeholder="#" />
                  <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-7 flex-1 text-xs" placeholder="Nom" />
                  <button onClick={saveEdit} className="p-1 text-primary"><Check size={14} /></button>
                </>
              ) : (
                <>
                  <span className="w-8 text-center text-xs font-black text-team-blue bg-team-blue/10 rounded py-0.5">#{p.number}</span>
                  <span className="flex-1 text-xs font-medium text-foreground truncate">{p.name || '—'}</span>
                  <button onClick={() => startEdit(p)} className="p-1 text-muted-foreground hover:text-foreground"><Pencil size={12} /></button>
                  <button onClick={() => removePlayer(p.id)} className="p-1 text-destructive/60 hover:text-destructive"><X size={12} /></button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add player */}
      <div className="flex gap-1.5">
        <Input
          value={newNumber}
          onChange={e => setNewNumber(e.target.value)}
          className="h-8 w-14 text-xs"
          placeholder="#"
          onKeyDown={e => e.key === 'Enter' && addPlayer()}
        />
        <Input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          className="h-8 flex-1 text-xs"
          placeholder="Nom (optionnel)"
          onKeyDown={e => e.key === 'Enter' && addPlayer()}
        />
        <button
          onClick={addPlayer}
          disabled={!newNumber.trim()}
          className="px-2.5 h-8 rounded-md bg-team-blue text-primary-foreground text-xs font-semibold disabled:opacity-30 transition-all"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
