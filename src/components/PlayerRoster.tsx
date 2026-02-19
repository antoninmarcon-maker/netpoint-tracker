import { useState, useRef, useEffect, useMemo } from 'react';
import { Users, Plus, X, Pencil, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Player, SportType } from '@/types/sports';
import { Input } from '@/components/ui/input';
import { getSavedPlayers, syncMatchPlayersToPool } from '@/lib/savedPlayers';

interface PlayerRosterProps {
  players: Player[];
  onSetPlayers: (players: Player[]) => void;
  teamName: string;
  sport?: SportType;
  userId?: string | null;
  readOnly?: boolean;
}

export function PlayerRoster({ players, onSetPlayers, teamName, sport = 'volleyball', userId, readOnly = false }: PlayerRosterProps) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [newNumber, setNewNumber] = useState('');
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNumber, setEditNumber] = useState('');
  const [editName, setEditName] = useState('');
  const [savedPlayers, setSavedPlayers] = useState<{ id: string; number: string; name: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const numberRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Load saved players pool
  useEffect(() => {
    getSavedPlayers(sport, userId).then(setSavedPlayers);
  }, [sport, userId]);

  // Sync match players to pool when roster changes
  useEffect(() => {
    if (players.length > 0) {
      syncMatchPlayersToPool(sport, players, userId).then(() => {
        getSavedPlayers(sport, userId).then(setSavedPlayers);
      });
    }
  }, [players, sport, userId]);

  // Filter suggestions based on input
  const suggestions = useMemo(() => {
    const query = newName.trim().toLowerCase();
    const numQuery = newNumber.trim();
    if (!query && !numQuery) return [];
    
    return savedPlayers.filter(sp => {
      // Don't suggest players already in the roster
      if (players.some(p => p.number === sp.number && p.name === sp.name)) return false;
      
      const nameMatch = query ? sp.name.toLowerCase().includes(query) : true;
      const numMatch = numQuery ? sp.number.includes(numQuery) : true;
      return nameMatch && numMatch;
    }).slice(0, 5);
  }, [newName, newNumber, savedPlayers, players]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
    setShowSuggestions(false);
    setTimeout(() => numberRef.current?.focus(), 0);
  };

  const selectSuggestion = (sp: { number: string; name: string }) => {
    setNewNumber(sp.number);
    setNewName(sp.name);
    setShowSuggestions(false);
    // Auto-add
    const player: Player = {
      id: crypto.randomUUID(),
      number: sp.number,
      name: sp.name,
    };
    onSetPlayers([...players, player]);
    setNewNumber('');
    setNewName('');
    setTimeout(() => numberRef.current?.focus(), 0);
  };

  const addAllSaved = () => {
    const toAdd = savedPlayers.filter(sp =>
      !players.some(p => p.number === sp.number && p.name === sp.name)
    );
    if (toAdd.length === 0) return;
    const newPlayers = toAdd.map(sp => ({
      id: crypto.randomUUID(),
      number: sp.number,
      name: sp.name,
    }));
    onSetPlayers([...players, ...newPlayers]);
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

  const availableSavedCount = savedPlayers.filter(sp =>
    !players.some(p => p.number === sp.number && p.name === sp.name)
  ).length;

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
        <button onClick={() => setCollapsed(c => !c)} className="flex-1 flex items-center gap-1.5 text-left">
          <Users size={14} className="text-team-blue" />
          <p className="text-sm font-bold text-team-blue">Roster {teamName} ({players.length})</p>
          {collapsed ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronUp size={14} className="text-muted-foreground" />}
        </button>
        <button onClick={() => setOpen(false)} className="p-1 rounded-md text-muted-foreground hover:text-foreground">
          <X size={16} />
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Quick add all saved players */}
          {!readOnly && availableSavedCount > 0 && (
            <button
              onClick={addAllSaved}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all"
            >
              <Users size={12} />
              Ajouter les {availableSavedCount} joueurs sauvegardés
            </button>
          )}

          {/* Player list */}
          {players.length > 0 && (
            <div className="space-y-1">
              {players.map(p => (
                <div key={p.id} className="flex items-center gap-2 bg-secondary/50 rounded-lg px-2.5 py-1.5">
                  {editingId === p.id && !readOnly ? (
                    <>
                      <Input value={editNumber} onChange={e => setEditNumber(e.target.value)} className="h-7 w-14 text-xs" placeholder="#" />
                      <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-7 flex-1 text-xs" placeholder="Nom" />
                      <button onClick={saveEdit} className="p-1 text-primary"><Check size={14} /></button>
                    </>
                  ) : (
                    <>
                      <span className="w-8 text-center text-xs font-black text-team-blue bg-team-blue/10 rounded py-0.5">#{p.number}</span>
                      <span className="flex-1 text-xs font-medium text-foreground truncate">{p.name || '—'}</span>
                      {!readOnly && (
                        <>
                          <button onClick={() => startEdit(p)} className="p-1 text-muted-foreground hover:text-foreground"><Pencil size={12} /></button>
                          <button onClick={() => removePlayer(p.id)} className="p-1 text-destructive/60 hover:text-destructive"><X size={12} /></button>
                        </>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add player with autocomplete */}
          {!readOnly && (
            <div className="relative" ref={suggestionsRef}>
              <div className="flex gap-1.5">
                <Input
                  ref={numberRef}
                  value={newNumber}
                  onChange={e => { setNewNumber(e.target.value); setShowSuggestions(true); }}
                  className="h-8 w-14 text-xs"
                  placeholder="#"
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); nameRef.current?.focus(); } }}
                />
                <Input
                  ref={nameRef}
                  value={newName}
                  onChange={e => { setNewName(e.target.value); setShowSuggestions(true); }}
                  className="h-8 flex-1 text-xs"
                  placeholder="Nom du joueur"
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPlayer(); } }}
                />
                <button
                  onClick={addPlayer}
                  disabled={!newNumber.trim()}
                  className="px-2.5 h-8 rounded-md bg-team-blue text-primary-foreground text-xs font-semibold disabled:opacity-30 transition-all"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                  {suggestions.map(sp => (
                    <button
                      key={sp.id}
                      onClick={() => selectSuggestion(sp)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary transition-colors text-left"
                    >
                      <span className="w-7 text-center font-black text-team-blue bg-team-blue/10 rounded py-0.5">#{sp.number}</span>
                      <span className="font-medium text-foreground">{sp.name || '—'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
