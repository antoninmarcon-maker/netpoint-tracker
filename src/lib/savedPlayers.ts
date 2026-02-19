import { supabase } from '@/integrations/supabase/client';
import { Player, SportType } from '@/types/sports';

const SAVED_PLAYERS_KEY = 'volley-tracker-saved-players';

interface SavedPlayer {
  id: string;
  number: string;
  name: string;
  sport: SportType;
}

// ---- LOCAL (guest) ----

function getLocalSavedPlayers(sport: SportType): SavedPlayer[] {
  try {
    const raw = localStorage.getItem(SAVED_PLAYERS_KEY);
    if (!raw) return [];
    const all: SavedPlayer[] = JSON.parse(raw);
    return all.filter(p => p.sport === sport);
  } catch { return []; }
}

function saveLocalSavedPlayers(players: SavedPlayer[]) {
  try {
    const raw = localStorage.getItem(SAVED_PLAYERS_KEY);
    const existing: SavedPlayer[] = raw ? JSON.parse(raw) : [];
    // Keep other sports, replace current sport
    const sport = players[0]?.sport;
    const others = sport ? existing.filter(p => p.sport !== sport) : existing;
    localStorage.setItem(SAVED_PLAYERS_KEY, JSON.stringify([...others, ...players]));
  } catch { }
}

function mergeLocalPlayers(sport: SportType, matchPlayers: Player[]) {
  const existing = getLocalSavedPlayers(sport);
  const newOnes = matchPlayers.filter(mp =>
    mp.name.trim() && !existing.some(e => e.name === mp.name)
  );
  if (newOnes.length > 0) {
    saveLocalSavedPlayers([
      ...existing,
      ...newOnes.map(p => ({ id: crypto.randomUUID(), number: '', name: p.name, sport })),
    ]);
  }
}

// ---- CLOUD ----

async function getCloudSavedPlayers(sport: SportType): Promise<SavedPlayer[]> {
  const { data, error } = await supabase
    .from('saved_players')
    .select('*')
    .eq('sport', sport)
    .order('name');
  if (error || !data) return [];
  return data.map(r => ({ id: r.id, number: r.number, name: r.name, sport: r.sport as SportType }));
}

async function mergeCloudPlayers(userId: string, sport: SportType, matchPlayers: Player[]) {
  const existing = await getCloudSavedPlayers(sport);
  const newOnes = matchPlayers.filter(mp =>
    mp.name.trim() && !existing.some(e => e.name === mp.name)
  );
  if (newOnes.length === 0) return;
  const rows = newOnes.map(p => ({
    user_id: userId,
    sport,
    number: '',
    name: p.name,
  }));
  await supabase.from('saved_players').insert(rows);
}

async function deleteCloudSavedPlayer(id: string) {
  await supabase.from('saved_players').delete().eq('id', id);
}

// ---- PUBLIC API ----

export async function getSavedPlayers(sport: SportType, userId?: string | null): Promise<SavedPlayer[]> {
  if (userId) {
    return getCloudSavedPlayers(sport);
  }
  return getLocalSavedPlayers(sport);
}

export async function syncMatchPlayersToPool(sport: SportType, matchPlayers: Player[], userId?: string | null) {
  if (userId) {
    await mergeCloudPlayers(userId, sport, matchPlayers);
  } else {
    mergeLocalPlayers(sport, matchPlayers);
  }
}

export async function removeSavedPlayer(id: string, sport: SportType, userId?: string | null) {
  if (userId) {
    await deleteCloudSavedPlayer(id);
  } else {
    const existing = getLocalSavedPlayers(sport);
    saveLocalSavedPlayers(existing.filter(p => p.id !== id));
  }
}
