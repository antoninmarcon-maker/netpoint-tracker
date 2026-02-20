import { z } from 'zod';
import { MatchSummary, Player, SportType } from '@/types/sports';

const MATCHES_KEY = 'volley-tracker-matches';
const ACTIVE_MATCH_KEY = 'volley-tracker-active-match-id';
const LAST_ROSTER_KEY = 'volley-tracker-last-roster';

// --- Zod schemas for runtime validation ---

const PlayerSchema = z.object({
  id: z.string(),
  number: z.string().optional(),
  name: z.string(),
});

const PointSchema = z.object({
  id: z.string(),
  team: z.enum(['blue', 'red']),
  type: z.enum(['scored', 'fault']),
  action: z.string(),
  x: z.number(),
  y: z.number(),
  timestamp: z.number(),
  playerId: z.string().optional(),
  pointValue: z.number().optional(),
});

const SetDataSchema = z.object({
  id: z.string(),
  number: z.number(),
  points: z.array(PointSchema),
  score: z.object({ blue: z.number(), red: z.number() }),
  winner: z.enum(['blue', 'red']).nullable(),
  duration: z.number(),
});

const MatchSummarySchema = z.object({
  id: z.string(),
  teamNames: z.object({ blue: z.string(), red: z.string() }),
  completedSets: z.array(SetDataSchema),
  currentSetNumber: z.number(),
  points: z.array(PointSchema),
  sidesSwapped: z.boolean(),
  chronoSeconds: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  finished: z.boolean(),
  players: z.array(PlayerSchema).optional(),
  sport: z.enum(['volleyball', 'basketball', 'tennis', 'padel']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// --- Storage functions ---

export function getAllMatches(): MatchSummary[] {
  try {
    const raw = localStorage.getItem(MATCHES_KEY);
    if (import.meta.env.DEV) console.log('[DEBUG] getAllMatches raw entries:', raw ? JSON.parse(raw).length : 0);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Parse each match individually so one bad entry doesn't kill everything
    return parsed.reduce<MatchSummary[]>((acc, item) => {
      const result = MatchSummarySchema.safeParse(item);
      if (result.success) {
        acc.push(result.data as unknown as MatchSummary);
      } else {
        // Try partial recovery: keep the raw item if it has an id
        if (item && typeof item === 'object' && item.id) {
          if (import.meta.env.DEV) console.warn('Match entry has validation issues, using raw data:', item.id, result.error.issues);
          acc.push(item as MatchSummary);
        } else {
          if (import.meta.env.DEV) console.warn('Skipping invalid match entry:', item?.id, result.error.issues);
        }
      }
      return acc;
    }, []);
  } catch (e) { if (import.meta.env.DEV) console.error('[DEBUG] getAllMatches error:', e); return []; }
}

export function getMatch(id: string): MatchSummary | null {
  return getAllMatches().find(m => m.id === id) ?? null;
}

export function saveMatch(match: MatchSummary) {
  const matches = getAllMatches();
  const idx = matches.findIndex(m => m.id === match.id);
  if (idx >= 0) {
    matches[idx] = { ...match, updatedAt: Date.now() };
  } else {
    matches.push(match);
  }
  localStorage.setItem(MATCHES_KEY, JSON.stringify(matches));
}

export function deleteMatch(id: string) {
  const matches = getAllMatches().filter(m => m.id !== id);
  localStorage.setItem(MATCHES_KEY, JSON.stringify(matches));
  if (getActiveMatchId() === id) clearActiveMatchId();
}

export function getActiveMatchId(): string | null {
  return localStorage.getItem(ACTIVE_MATCH_KEY);
}

export function setActiveMatchId(id: string) {
  localStorage.setItem(ACTIVE_MATCH_KEY, id);
}

export function clearActiveMatchId() {
  localStorage.removeItem(ACTIVE_MATCH_KEY);
}

export function saveLastRoster(players: Player[]) {
  localStorage.setItem(LAST_ROSTER_KEY, JSON.stringify(players));
}

export function getLastRoster(): Player[] {
  try {
    const raw = localStorage.getItem(LAST_ROSTER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const result = z.array(PlayerSchema).safeParse(parsed);
    if (result.success) return result.data as unknown as Player[];
    if (import.meta.env.DEV) console.warn('Last roster validation failed, using raw data:', result.error.issues);
    return Array.isArray(parsed) ? parsed as Player[] : [];
  } catch { return []; }
}

export function createNewMatch(teamNames: { blue: string; red: string }, sport: SportType = 'volleyball', metadata?: Record<string, unknown>): MatchSummary {
  const lastRoster = getLastRoster();
  return {
    id: crypto.randomUUID(),
    teamNames,
    completedSets: [],
    currentSetNumber: 1,
    points: [],
    sidesSwapped: false,
    chronoSeconds: 0,
    players: lastRoster.map(p => ({ ...p, id: crypto.randomUUID() })),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    finished: false,
    sport,
    metadata: metadata as any,
  };
}
