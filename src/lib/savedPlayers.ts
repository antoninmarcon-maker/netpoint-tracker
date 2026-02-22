import { supabase } from '@/integrations/supabase/client';
import { Player, SportType } from '@/types/sports';

const SAVED_PLAYERS_KEY = 'volley-tracker-saved-players';
const JERSEY_CONFIG_KEY = 'myvolley-jersey-config';

export interface SavedPlayer {
  id: string;
  name: string;
  number?: string;
  sport: SportType;
}

// ---- JERSEY NUMBER CONFIG ----

const DEFAULT_JERSEY_CONFIG: Record<SportType, boolean> = {
  volleyball: true,
  basketball: true,
  tennis: false,
  padel: false,
};

export function getJerseyConfig(): Record<SportType, boolean> {
  try {
    const raw = localStorage.getItem(JERSEY_CONFIG_KEY);
    if (!raw) return { ...DEFAULT_JERSEY_CONFIG };
    return { ...DEFAULT_JERSEY_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_JERSEY_CONFIG };
  }
}

export function setJerseyEnabled(sport: SportType, enabled: boolean): Record<SportType, boolean> {
  const config = getJerseyConfig();
  config[sport] = enabled;
  localStorage.setItem(JERSEY_CONFIG_KEY, JSON.stringify(config));
  return config;
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
      ...newOnes.map(p => ({ id: crypto.randomUUID(), name: p.name, sport })),
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
  return data.map(r => ({ id: r.id, name: r.name, sport: r.sport as SportType }));
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

export async function addSavedPlayer(name: string, sport: SportType, userId?: string | null, number?: string): Promise<SavedPlayer> {
  const player: SavedPlayer = { id: crypto.randomUUID(), name: name.trim(), sport, ...(number ? { number } : {}) };
  if (userId) {
    const { data } = await supabase.from('saved_players').insert({
      user_id: userId,
      sport,
      name: name.trim(),
    }).select().single();
    if (data) player.id = data.id;
    // Number stored locally only (no DB column yet)
  } else {
    const existing = getLocalSavedPlayers(sport);
    saveLocalSavedPlayers([...existing, player]);
  }
  // Save number in local jersey map
  if (number) savePlayerNumber(player.id, number);
  return player;
}

export async function updateSavedPlayerName(id: string, newName: string, sport: SportType, userId?: string | null) {
  if (userId) {
    await supabase.from('saved_players').update({ name: newName.trim() }).eq('id', id);
  } else {
    const existing = getLocalSavedPlayers(sport);
    const updated = existing.map(p => p.id === id ? { ...p, name: newName.trim() } : p);
    saveLocalSavedPlayers(updated);
  }
}

export async function updateSavedPlayerNumber(id: string, number: string) {
  savePlayerNumber(id, number);
}

// ---- JERSEY NUMBER STORAGE (localStorage-based, per player id) ----

const JERSEY_NUMBERS_KEY = 'myvolley-player-numbers';

function getPlayerNumbersMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(JERSEY_NUMBERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function savePlayerNumber(id: string, number: string) {
  const map = getPlayerNumbersMap();
  if (number.trim()) {
    map[id] = number.trim();
  } else {
    delete map[id];
  }
  localStorage.setItem(JERSEY_NUMBERS_KEY, JSON.stringify(map));
}

export function getPlayerNumber(id: string): string | undefined {
  return getPlayerNumbersMap()[id];
}

export function getPlayerNumbers(): Record<string, string> {
  return getPlayerNumbersMap();
}
