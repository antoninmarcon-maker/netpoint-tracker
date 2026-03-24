import { describe, it, expect, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Favorites logic extracted from SpotDetailModal (pure functions, no DOM)
// ---------------------------------------------------------------------------

const FAVORITES_KEY = 'spot_favorites';

/** Read favorites from a storage string (simulates localStorage.getItem). */
const readFavorites = (raw: string | null): string[] => {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/** Check whether a spotId is in the favorites list. */
const isFavorite = (raw: string | null, spotId: string): boolean =>
  readFavorites(raw).includes(spotId);

/** Toggle a favorite and return the next serialised state. */
const toggleFavorite = (raw: string | null, spotId: string): string => {
  const favs = readFavorites(raw);
  const already = favs.includes(spotId);
  const next = already ? favs.filter(f => f !== spotId) : [...favs, spotId];
  return JSON.stringify(next);
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Favorites — readFavorites', () => {
  it('returns empty array when raw is null (no prior favorites)', () => {
    expect(readFavorites(null)).toEqual([]);
  });

  it('returns empty array for empty JSON array string', () => {
    expect(readFavorites('[]')).toEqual([]);
  });

  it('parses a valid JSON array of IDs', () => {
    expect(readFavorites('["a","b"]')).toEqual(['a', 'b']);
  });

  it('returns empty array for corrupted JSON', () => {
    expect(readFavorites('{not valid')).toEqual([]);
  });

  it('returns empty array when stored value is a non-array JSON', () => {
    expect(readFavorites('42')).toEqual([]);
    expect(readFavorites('"hello"')).toEqual([]);
    expect(readFavorites('{}')).toEqual([]);
  });
});

describe('Favorites — isFavorite', () => {
  it('returns true for a saved ID', () => {
    expect(isFavorite('["spot-1","spot-2"]', 'spot-1')).toBe(true);
  });

  it('returns false for an unknown ID', () => {
    expect(isFavorite('["spot-1"]', 'spot-99')).toBe(false);
  });

  it('returns false when storage is null', () => {
    expect(isFavorite(null, 'spot-1')).toBe(false);
  });

  it('returns false when storage is corrupted', () => {
    expect(isFavorite('%%%', 'spot-1')).toBe(false);
  });
});

describe('Favorites — toggleFavorite', () => {
  it('toggle ON adds spotId to empty array', () => {
    const next = JSON.parse(toggleFavorite(null, 'spot-1'));
    expect(next).toContain('spot-1');
    expect(next).toHaveLength(1);
  });

  it('toggle OFF removes spotId', () => {
    const next = JSON.parse(toggleFavorite('["spot-1","spot-2"]', 'spot-1'));
    expect(next).not.toContain('spot-1');
    expect(next).toContain('spot-2');
  });

  it('does not add duplicates when toggling ON twice', () => {
    const first = toggleFavorite(null, 'spot-1');
    const second = toggleFavorite(first, 'spot-1'); // toggles OFF
    const third = toggleFavorite(second, 'spot-1'); // toggles ON again
    const arr = JSON.parse(third);
    expect(arr.filter((id: string) => id === 'spot-1')).toHaveLength(1);
  });

  it('preserves other favorites when toggling one off', () => {
    const raw = '["a","b","c"]';
    const next = JSON.parse(toggleFavorite(raw, 'b'));
    expect(next).toEqual(['a', 'c']);
  });

  it('preserves other favorites when toggling one on', () => {
    const raw = '["a","c"]';
    const next = JSON.parse(toggleFavorite(raw, 'b'));
    expect(next).toEqual(['a', 'c', 'b']);
  });

  it('favorites persist across sequential operations', () => {
    let state: string | null = null;
    state = toggleFavorite(state, 'x');
    state = toggleFavorite(state, 'y');
    state = toggleFavorite(state, 'z');
    expect(JSON.parse(state)).toEqual(['x', 'y', 'z']);

    state = toggleFavorite(state, 'y'); // remove y
    expect(JSON.parse(state)).toEqual(['x', 'z']);
  });

  it('handles corrupted storage gracefully on toggle', () => {
    const next = JSON.parse(toggleFavorite('not-json', 'spot-1'));
    expect(next).toEqual(['spot-1']);
  });

  it('stress test: handles 100 favorites', () => {
    let state: string | null = null;
    for (let i = 0; i < 100; i++) {
      state = toggleFavorite(state, `spot-${i}`);
    }
    const arr = JSON.parse(state!);
    expect(arr).toHaveLength(100);
    expect(arr[0]).toBe('spot-0');
    expect(arr[99]).toBe('spot-99');
  });

  it('stress test: toggle all 100 off leaves empty array', () => {
    let state: string | null = null;
    for (let i = 0; i < 100; i++) {
      state = toggleFavorite(state, `spot-${i}`);
    }
    for (let i = 0; i < 100; i++) {
      state = toggleFavorite(state!, `spot-${i}`);
    }
    expect(JSON.parse(state!)).toEqual([]);
  });
});
