import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Rate limit logic (mirrors src/lib/rateLimit.ts)
// ---------------------------------------------------------------------------
const LIMIT = 10;
const STORAGE_KEY = 'myvolley_daily_actions';

/**
 * Extracted rate-limit logic for pure testing without DOM / toast dependency.
 * Mirrors checkAndIncrementRateLimit from src/lib/rateLimit.ts exactly.
 */
function checkAndIncrementRateLimit(
  storage: Record<string, string>,
  today: string,
): { allowed: boolean; storage: Record<string, string> } {
  let data = { date: today, count: 0 };

  try {
    const raw = storage[STORAGE_KEY];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === today) {
        data = parsed;
      }
    }
  } catch (_e) {
    // corrupted data — start fresh
  }

  if (data.count >= LIMIT) {
    return { allowed: false, storage };
  }

  data.count += 1;
  storage[STORAGE_KEY] = JSON.stringify(data);
  return { allowed: true, storage };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Rate limit — basic behaviour', () => {
  it('allows the first action of the day', () => {
    const result = checkAndIncrementRateLimit({}, '2026-03-24');
    expect(result.allowed).toBe(true);
  });

  it('allows up to 10 actions per day', () => {
    let storage: Record<string, string> = {};
    for (let i = 0; i < LIMIT; i++) {
      const result = checkAndIncrementRateLimit(storage, '2026-03-24');
      expect(result.allowed).toBe(true);
      storage = result.storage;
    }
  });

  it('blocks the 11th action on the same day', () => {
    let storage: Record<string, string> = {};
    for (let i = 0; i < LIMIT; i++) {
      storage = checkAndIncrementRateLimit(storage, '2026-03-24').storage;
    }
    const result = checkAndIncrementRateLimit(storage, '2026-03-24');
    expect(result.allowed).toBe(false);
  });

  it('returns false for every call after limit is reached', () => {
    let storage: Record<string, string> = {};
    for (let i = 0; i < LIMIT; i++) {
      storage = checkAndIncrementRateLimit(storage, '2026-03-24').storage;
    }
    // Multiple calls after limit
    expect(checkAndIncrementRateLimit(storage, '2026-03-24').allowed).toBe(false);
    expect(checkAndIncrementRateLimit(storage, '2026-03-24').allowed).toBe(false);
  });
});

describe('Rate limit — counter tracking', () => {
  it('increments counter on each allowed call', () => {
    let storage: Record<string, string> = {};
    for (let i = 1; i <= 5; i++) {
      storage = checkAndIncrementRateLimit(storage, '2026-03-24').storage;
      const data = JSON.parse(storage[STORAGE_KEY]);
      expect(data.count).toBe(i);
    }
  });

  it('does not increment counter when limit is reached', () => {
    let storage: Record<string, string> = {};
    for (let i = 0; i < LIMIT; i++) {
      storage = checkAndIncrementRateLimit(storage, '2026-03-24').storage;
    }
    const countBefore = JSON.parse(storage[STORAGE_KEY]).count;
    checkAndIncrementRateLimit(storage, '2026-03-24');
    const countAfter = JSON.parse(storage[STORAGE_KEY]).count;
    expect(countAfter).toBe(countBefore);
  });
});

describe('Rate limit — day reset', () => {
  it('resets counter on a new day', () => {
    let storage: Record<string, string> = {};
    // Exhaust limit on day 1
    for (let i = 0; i < LIMIT; i++) {
      storage = checkAndIncrementRateLimit(storage, '2026-03-24').storage;
    }
    expect(checkAndIncrementRateLimit(storage, '2026-03-24').allowed).toBe(false);

    // New day — should be allowed again
    const result = checkAndIncrementRateLimit(storage, '2026-03-25');
    expect(result.allowed).toBe(true);
  });

  it('starts a fresh counter for the new day', () => {
    let storage: Record<string, string> = {};
    for (let i = 0; i < 5; i++) {
      storage = checkAndIncrementRateLimit(storage, '2026-03-24').storage;
    }
    storage = checkAndIncrementRateLimit(storage, '2026-03-25').storage;
    const data = JSON.parse(storage[STORAGE_KEY]);
    expect(data.count).toBe(1);
    expect(data.date).toBe('2026-03-25');
  });
});

describe('Rate limit — storage key', () => {
  it('uses the correct localStorage key', () => {
    const storage: Record<string, string> = {};
    checkAndIncrementRateLimit(storage, '2026-03-24');
    expect(STORAGE_KEY).toBe('myvolley_daily_actions');
  });

  it('stores data under the expected key', () => {
    let storage: Record<string, string> = {};
    storage = checkAndIncrementRateLimit(storage, '2026-03-24').storage;
    expect(storage['myvolley_daily_actions']).toBeDefined();
  });
});

describe('Rate limit — storage format', () => {
  it('stores ISO date string for day tracking', () => {
    let storage: Record<string, string> = {};
    storage = checkAndIncrementRateLimit(storage, '2026-03-24').storage;
    const data = JSON.parse(storage[STORAGE_KEY]);
    expect(data.date).toBe('2026-03-24');
    expect(data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('stores count as a number', () => {
    let storage: Record<string, string> = {};
    storage = checkAndIncrementRateLimit(storage, '2026-03-24').storage;
    const data = JSON.parse(storage[STORAGE_KEY]);
    expect(typeof data.count).toBe('number');
  });
});

describe('Rate limit — corrupted / missing data', () => {
  it('handles missing localStorage data (first-ever usage)', () => {
    const result = checkAndIncrementRateLimit({}, '2026-03-24');
    expect(result.allowed).toBe(true);
    const data = JSON.parse(result.storage[STORAGE_KEY]);
    expect(data.count).toBe(1);
  });

  it('handles corrupted JSON in localStorage', () => {
    const storage: Record<string, string> = {
      [STORAGE_KEY]: 'not-valid-json{{{',
    };
    const result = checkAndIncrementRateLimit(storage, '2026-03-24');
    expect(result.allowed).toBe(true);
    const data = JSON.parse(result.storage[STORAGE_KEY]);
    expect(data.count).toBe(1);
  });

  it('handles localStorage with wrong shape (missing fields)', () => {
    const storage: Record<string, string> = {
      [STORAGE_KEY]: JSON.stringify({ foo: 'bar' }),
    };
    // date won't match today, so it resets
    const result = checkAndIncrementRateLimit(storage, '2026-03-24');
    expect(result.allowed).toBe(true);
  });
});
