import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAllMatches, getMatch, saveMatch, deleteMatch,
  getActiveMatchId, setActiveMatchId, clearActiveMatchId,
  saveLastRoster, getLastRoster, createNewMatch,
} from '@/lib/matchStorage';
import type { MatchSummary, Player } from '@/types/sports';

// Ensure guest namespace for consistent test keys
import { setActiveUserId } from '@/lib/userStorage';

function makeMatch(overrides?: Partial<MatchSummary>): MatchSummary {
  return {
    id: crypto.randomUUID(),
    teamNames: { blue: 'Blue', red: 'Red' },
    completedSets: [],
    currentSetNumber: 1,
    points: [],
    sidesSwapped: false,
    chronoSeconds: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    finished: false,
    sport: 'volleyball',
    ...overrides,
  };
}

describe('matchStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    setActiveUserId(null); // ensure guest namespace
  });

  // ── CRUD ──
  describe('CRUD operations', () => {
    it('returns empty array when no matches saved', () => {
      expect(getAllMatches()).toEqual([]);
    });

    it('saves and retrieves a match', () => {
      const match = makeMatch({ id: 'test-1' });
      saveMatch(match);
      expect(getAllMatches()).toHaveLength(1);
      expect(getMatch('test-1')).toBeTruthy();
      expect(getMatch('test-1')!.id).toBe('test-1');
    });

    it('updates existing match (upsert)', () => {
      const match = makeMatch({ id: 'test-1', chronoSeconds: 0 });
      saveMatch(match);
      saveMatch({ ...match, chronoSeconds: 120 });
      const all = getAllMatches();
      expect(all).toHaveLength(1);
      expect(all[0].chronoSeconds).toBe(120);
    });

    it('updates updatedAt on upsert (second save)', () => {
      const match = makeMatch({ id: 'test-1', updatedAt: 1000 });
      saveMatch(match);
      // Second save triggers upsert path which refreshes updatedAt
      saveMatch({ ...match, chronoSeconds: 99 });
      const saved = getMatch('test-1')!;
      expect(saved.updatedAt).toBeGreaterThan(1000);
    });

    it('deletes a match', () => {
      saveMatch(makeMatch({ id: 'del-1' }));
      saveMatch(makeMatch({ id: 'del-2' }));
      deleteMatch('del-1');
      expect(getAllMatches()).toHaveLength(1);
      expect(getMatch('del-1')).toBeNull();
    });

    it('getMatch returns null for non-existent id', () => {
      expect(getMatch('nope')).toBeNull();
    });

    it('handles corrupted localStorage gracefully', () => {
      localStorage.setItem('volley-tracker-matches_guest', 'broken-json');
      expect(getAllMatches()).toEqual([]);
    });
  });

  // ── Active match ──
  describe('active match tracking', () => {
    it('returns null when no active match', () => {
      expect(getActiveMatchId()).toBeNull();
    });

    it('sets and gets active match id', () => {
      setActiveMatchId('match-42');
      expect(getActiveMatchId()).toBe('match-42');
    });

    it('clears active match id', () => {
      setActiveMatchId('match-42');
      clearActiveMatchId();
      expect(getActiveMatchId()).toBeNull();
    });

    it('deleting active match clears active id', () => {
      const match = makeMatch({ id: 'active-del' });
      saveMatch(match);
      setActiveMatchId('active-del');
      deleteMatch('active-del');
      expect(getActiveMatchId()).toBeNull();
    });

    it('deleting non-active match does not clear active id', () => {
      saveMatch(makeMatch({ id: 'other' }));
      setActiveMatchId('keep-this');
      deleteMatch('other');
      expect(getActiveMatchId()).toBe('keep-this');
    });
  });

  // ── Roster persistence ──
  describe('roster persistence', () => {
    it('returns empty array when no roster saved', () => {
      expect(getLastRoster()).toEqual([]);
    });

    it('saves and retrieves roster', () => {
      const roster: Player[] = [
        { id: 'p1', name: 'Lucas', number: '7' },
        { id: 'p2', name: 'Emma' },
      ];
      saveLastRoster(roster);
      const loaded = getLastRoster();
      expect(loaded).toHaveLength(2);
      expect(loaded[0].name).toBe('Lucas');
      expect(loaded[0].number).toBe('7');
    });

    it('handles corrupted roster data', () => {
      localStorage.setItem('volley-tracker-last-roster_guest', 'bad-data');
      expect(getLastRoster()).toEqual([]);
    });
  });

  // ── createNewMatch ──
  describe('createNewMatch', () => {
    it('creates match with default values', () => {
      const match = createNewMatch({ blue: 'Hawks', red: 'Eagles' });
      expect(match.teamNames).toEqual({ blue: 'Hawks', red: 'Eagles' });
      expect(match.completedSets).toEqual([]);
      expect(match.currentSetNumber).toBe(1);
      expect(match.points).toEqual([]);
      expect(match.finished).toBe(false);
      expect(match.sport).toBe('volleyball');
      expect(match.id).toBeTruthy();
    });

    it('hydrates players from last roster with new IDs', () => {
      saveLastRoster([{ id: 'old-1', name: 'Lucas', number: '7' }]);
      const match = createNewMatch({ blue: 'A', red: 'B' });
      expect(match.players).toHaveLength(1);
      expect(match.players![0].name).toBe('Lucas');
      expect(match.players![0].id).not.toBe('old-1'); // new ID generated
    });

    it('applies custom metadata', () => {
      const match = createNewMatch({ blue: 'A', red: 'B' }, 'volleyball', { hasCourt: false });
      expect((match.metadata as any)?.hasCourt).toBe(false);
    });
  });
});
