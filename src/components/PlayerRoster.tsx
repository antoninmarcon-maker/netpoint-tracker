import { useState, useRef, useEffect, useMemo } from 'react';
import { Users, Plus, X, Pencil, Check, ChevronDown, ChevronUp, UserPlus } from 'lucide-react';
import { Player, SportType } from '@/types/sports';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getSavedPlayers, syncMatchPlayersToPool, getJerseyConfig, getPlayerNumber, updateSavedPlayerNumber } from '@/lib/savedPlayers';
import { getAllMatches } from '@/lib/matchStorage';
import { getCloudMatches } from '@/lib/cloudStorage';
import { useTranslation } from 'react-i18next';

interface PlayerRosterProps {
  players: Player[];
  onSetPlayers: (players: Player[]) => void;
  teamName: string;
  sport?: SportType;
  userId?: string | null;
  readOnly?: boolean;
}

export function PlayerRoster({ players, onSetPlayers, teamName, sport = 'volleyball', userId, readOnly = false }: PlayerRosterProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [savedPlayers, setSavedPlayers] = useState<{ id: string; name: string; number?: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedImportIds, setSelectedImportIds] = useState<Set<string>>(new Set());
  const [playerStats, setPlayerStats] = useState<Record<string, { matches: number; scored: number; faults: number }>>({}); 
  const nameRef = useRef<HTMLInputElement>(null);
  const numberRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const jerseyEnabled = getJerseyConfig()[sport];

  // Compute next number suggestion
  const nextNumber = useMemo(() => {
    if (!jerseyEnabled) return '';
    const nums = players
      .map(p => {
        const n = getPlayerNumber(p.id);
        return n ? parseInt(n, 10) : NaN;
      })
      .filter(n => !isNaN(n));
    if (nums.length === 0) return '1';
    return String(Math.max(...nums) + 1);
  }, [players, jerseyEnabled]);

  // Set default number when adding
  useEffect(() => {
    if (jerseyEnabled && !newNumber) {
      setNewNumber(nextNumber);
    }
  }, [nextNumber, jerseyEnabled]);

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
    if (!query) return [];
    
    return savedPlayers.filter(sp => {
      if (players.some(p => p.name === sp.name)) return false;
      return sp.name.toLowerCase().includes(query);
    }).slice(0, 5);
  }, [newName, savedPlayers, players]);

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
    if (!newName.trim()) return;
    // Check if this player name exists in saved pool to recover their jersey number
    const savedMatch = savedPlayers.find(sp => sp.name.toLowerCase() === newName.trim().toLowerCase());
    const savedNum = savedMatch ? getPlayerNumber(savedMatch.id) : undefined;
    const numberToUse = newNumber.trim() || savedNum || '';
    const player: Player = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      ...(jerseyEnabled && numberToUse ? { number: numberToUse } : {}),
    };
    // Save number to localStorage
    if (jerseyEnabled && numberToUse) {
      updateSavedPlayerNumber(player.id, numberToUse, userId);
    }
    onSetPlayers([...players, player]);
    setNewName('');
    setNewNumber('');
    setShowSuggestions(false);
    setTimeout(() => {
      if (jerseyEnabled && numberRef.current) {
        numberRef.current.focus();
      } else if (nameRef.current) {
        nameRef.current.focus();
      }
    }, 0);
  };

  const selectSuggestion = (sp: { id: string; name: string; number?: string }) => {
    setShowSuggestions(false);
    const savedNum = getPlayerNumber(sp.id) || sp.number;
    const player: Player = {
      id: crypto.randomUUID(),
      name: sp.name,
      ...(jerseyEnabled && savedNum ? { number: savedNum } : {}),
    };
    if (jerseyEnabled && savedNum) {
      updateSavedPlayerNumber(player.id, savedNum, userId);
    }
    onSetPlayers([...players, player]);
    setNewName('');
    setNewNumber('');
    setTimeout(() => {
      if (jerseyEnabled && numberRef.current) {
        numberRef.current.focus();
      } else if (nameRef.current) {
        nameRef.current.focus();
      }
    }, 0);
  };

  const addAllSaved = (idsToAdd?: Set<string>) => {
    const toAdd = savedPlayers.filter(sp =>
      !players.some(p => p.name === sp.name) && (!idsToAdd || idsToAdd.has(sp.id))
    );
    if (toAdd.length === 0) return;
    const newPlayers = toAdd.map(sp => {
      const savedNum = getPlayerNumber(sp.id) || sp.number;
      const player: Player = {
        id: crypto.randomUUID(),
        name: sp.name,
        ...(jerseyEnabled && savedNum ? { number: savedNum } : {}),
      };
      if (jerseyEnabled && savedNum) {
        updateSavedPlayerNumber(player.id, savedNum, userId);
      }
      return player;
    });
    onSetPlayers([...players, ...newPlayers]);
  };

  // Compute stats for saved players when import dialog opens
  useEffect(() => {
    if (!showImportDialog) return;
    const computeStats = async () => {
      const allMatches = userId ? await getCloudMatches() : getAllMatches();
      const statsMap: Record<string, { matches: number; scored: number; faults: number }> = {};
      for (const sp of savedPlayers) {
        let matchCount = 0;
        let scored = 0;
        let faults = 0;
        for (const match of allMatches) {
          const matchPlayers = match.players ?? [];
          const matchPlayerId = matchPlayers.find(mp => mp.name === sp.name)?.id;
          if (!matchPlayerId) continue;
          matchCount++;
          const allPts = [...(match.completedSets?.flatMap(s => s.points) ?? []), ...(match.points ?? [])];
          for (const pt of allPts) {
            if (pt.playerId === matchPlayerId) {
              if (pt.type === 'scored') scored++;
              if (pt.type === 'fault') faults++;
            }
          }
        }
        statsMap[sp.id] = { matches: matchCount, scored, faults };
      }
      setPlayerStats(statsMap);
    };
    computeStats();
  }, [showImportDialog, savedPlayers, userId]);

  const availableForImport = useMemo(() =>
    savedPlayers.filter(sp => !players.some(p => p.name === sp.name)),
    [savedPlayers, players]
  );

  const handleImportConfirm = () => {
    addAllSaved(selectedImportIds);
    setShowImportDialog(false);
    setSelectedImportIds(new Set());
  };

  const toggleImportSelection = (id: string) => {
    setSelectedImportIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const removePlayer = (id: string) => {
    onSetPlayers(players.filter(p => p.id !== id));
  };

  const startEdit = (p: Player) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditNumber(getPlayerNumber(p.id) || p.number || '');
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;
    if (jerseyEnabled) {
      updateSavedPlayerNumber(editingId, editNumber.trim(), userId);
      // Also sync number back to the saved player pool by name
      const savedMatch = savedPlayers.find(sp => sp.name.toLowerCase() === editName.trim().toLowerCase());
      if (savedMatch) {
        updateSavedPlayerNumber(savedMatch.id, editNumber.trim(), userId);
      }
    }
    onSetPlayers(players.map(p => p.id === editingId ? {
      ...p,
      name: editName.trim(),
      ...(jerseyEnabled ? { number: editNumber.trim() || undefined } : {}),
    } : p));
    setEditingId(null);
  };

  const availableSavedCount = savedPlayers.filter(sp =>
    !players.some(p => p.name === sp.name)
  ).length;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg bg-team-blue/10 text-team-blue border border-team-blue/20 hover:bg-team-blue/20 transition-all"
      >
        <Users size={14} />
        {players.length > 0 ? t('roster.rosterTitle', { team: teamName, count: players.length }) : t('roster.defineRoster', { team: teamName })}
      </button>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between">
        <button onClick={() => setCollapsed(c => !c)} className="flex-1 flex items-center gap-1.5 text-left">
          <Users size={14} className="text-team-blue" />
          <p className="text-sm font-bold text-team-blue">{t('roster.rosterTitle', { team: teamName, count: players.length })}</p>
          {collapsed ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronUp size={14} className="text-muted-foreground" />}
        </button>
        <button onClick={() => setOpen(false)} className="p-1 rounded-md text-muted-foreground hover:text-foreground">
          <X size={16} />
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Import saved players */}
          {!readOnly && availableSavedCount > 0 && (
            <button
              onClick={() => {
                setSelectedImportIds(new Set(availableForImport.map(sp => sp.id)));
                setShowImportDialog(true);
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all"
            >
              <UserPlus size={12} />
              {t('roster.addSavedPlayers', { count: availableSavedCount })}
            </button>
          )}

          {/* Import Dialog */}
          <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
            <DialogContent className="max-w-sm rounded-2xl max-h-[80vh] overflow-auto">
              <DialogHeader>
                <DialogTitle className="text-center text-lg font-bold">{t('roster.importTitle')}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-2">
                {availableForImport.map(sp => {
                  const num = jerseyEnabled ? (getPlayerNumber(sp.id) || sp.number) : undefined;
                  const stats = playerStats[sp.id];
                  const isSelected = selectedImportIds.has(sp.id);
                  const ratio = stats && (stats.scored + stats.faults > 0)
                    ? Math.round((stats.scored / (stats.scored + stats.faults)) * 100)
                    : null;
                  return (
                    <button
                      key={sp.id}
                      onClick={() => toggleImportSelection(sp.id)}
                      className={`relative flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center ${isSelected ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-secondary/50'}`}
                    >
                      <div className="absolute top-2 right-2">
                        <Checkbox checked={isSelected} className="pointer-events-none" />
                      </div>
                      {num && (
                        <Badge variant="outline" className="rounded-full w-7 h-7 flex items-center justify-center text-xs font-black border-primary/30 text-primary bg-primary/10 p-0">
                          {num}
                        </Badge>
                      )}
                      <span className="text-xs font-semibold text-foreground truncate max-w-full">{sp.name}</span>
                      {stats && (
                        <div className="text-[10px] text-muted-foreground space-y-0.5">
                          <p>{t('roster.matchesPlayed', { count: stats.matches })}</p>
                          {ratio !== null && <p className="font-medium text-primary">Ratio : {ratio}%</p>}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={handleImportConfirm}
                disabled={selectedImportIds.size === 0}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                <Check size={16} /> {t('roster.confirmImport', { count: selectedImportIds.size })}
              </button>
            </DialogContent>
          </Dialog>

          {/* Player list */}
          {players.length > 0 && (
            <div className="space-y-1">
              {players.map(p => {
                const num = jerseyEnabled ? (getPlayerNumber(p.id) || p.number) : undefined;
                return (
                  <div key={p.id} className="flex items-center gap-2 bg-secondary/50 rounded-lg px-2.5 py-1.5">
                    {editingId === p.id && !readOnly ? (
                      <>
                        {jerseyEnabled && (
                          <Input
                            value={editNumber}
                            onChange={e => setEditNumber(e.target.value.slice(0, 3))}
                            placeholder={t('players.jerseyNumberPlaceholder')}
                            className="h-7 w-10 text-xs text-center font-bold px-1"
                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); }}
                          />
                        )}
                        <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-7 flex-1 text-xs" placeholder="Nom" onKeyDown={e => { if (e.key === 'Enter') saveEdit(); }} autoFocus />
                        <button onClick={saveEdit} className="p-1 text-primary"><Check size={14} /></button>
                      </>
                    ) : (
                      <>
                        {jerseyEnabled && num && (
                          <Badge variant="outline" className="rounded-full w-6 h-6 flex items-center justify-center text-[10px] font-black border-primary/30 text-primary bg-primary/10 shrink-0 p-0">
                            {num}
                          </Badge>
                        )}
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
                );
              })}
            </div>
          )}

          {/* Add player with autocomplete */}
          {!readOnly && !showAddForm && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddForm(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg bg-team-blue/10 text-team-blue border border-team-blue/20 hover:bg-team-blue/20 transition-all"
              >
                <Plus size={14} /> {t('roster.addNewPlayer')}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all"
              >
                {t('roster.collapseMenu')}
              </button>
            </div>
          )}
          {!readOnly && showAddForm && (
            <div className="relative" ref={suggestionsRef}>
              <div className="flex gap-1.5">
                {jerseyEnabled && (
                  <Input
                    ref={numberRef}
                    value={newNumber}
                    onChange={e => setNewNumber(e.target.value.slice(0, 3))}
                    placeholder={t('players.jerseyNumberPlaceholder')}
                    className="h-8 w-10 text-xs text-center font-bold px-1"
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); nameRef.current?.focus(); }
                    }}
                  />
                )}
                <Input
                  ref={nameRef}
                  value={newName}
                  onChange={e => { setNewName(e.target.value); setShowSuggestions(true); }}
                  className="h-8 flex-1 text-xs"
                  placeholder={t('roster.playerNamePlaceholder')}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPlayer(); } }}
                />
                <button
                  onClick={addPlayer}
                  disabled={!newName.trim()}
                  className="px-2.5 h-8 rounded-md bg-team-blue text-primary-foreground text-xs font-semibold disabled:opacity-30 transition-all"
                >
                  <Plus size={14} />
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                  {suggestions.map(sp => {
                    const savedNum = jerseyEnabled ? getPlayerNumber(sp.id) : undefined;
                    return (
                      <button
                        key={sp.id}
                        onClick={() => selectSuggestion(sp)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary transition-colors text-left"
                      >
                        {savedNum && (
                          <span className="text-[10px] font-black text-primary/60">#{savedNum}</span>
                        )}
                        <span className="font-medium text-foreground">{sp.name || '—'}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
