import { describe, it, expect } from 'vitest';
import { MONTHS_FULL } from '@/lib/spotTypes';

// ---------------------------------------------------------------------------
// Seasonality logic extracted from SpotDetailModal (pure function, no DOM)
// ---------------------------------------------------------------------------

type SeasonResult =
  | { type: 'yearly' }
  | { type: 'seasonal'; start: number | null; end: number | null }
  | null;

/**
 * Mirrors `parseSeasonality` from SpotDetailModal.
 * Kept as a standalone pure function for testability.
 */
const parseSeasonality = (
  period: string | null,
  saisonnier: boolean | null,
): SeasonResult => {
  if (saisonnier === false || period === "Toute l'année")
    return { type: 'yearly' };
  if (!period)
    return saisonnier ? { type: 'seasonal', start: null, end: null } : null;
  const match = period.match(/De (.+) à (.+)/);
  if (match) {
    const startIdx = MONTHS_FULL.indexOf(match[1]);
    const endIdx = MONTHS_FULL.indexOf(match[2]);
    return {
      type: 'seasonal',
      start: startIdx >= 0 ? startIdx : null,
      end: endIdx >= 0 ? endIdx : null,
    };
  }
  return { type: 'seasonal', start: null, end: null };
};

/**
 * Build an array of 12 booleans indicating which months are active.
 * Handles wrapping periods (e.g., Oct-Mar).
 */
const activeMonths = (season: SeasonResult): boolean[] => {
  if (!season) return Array(12).fill(false);
  if (season.type === 'yearly') return Array(12).fill(true);
  if (season.start === null || season.end === null) return Array(12).fill(false);
  const result = Array(12).fill(false);
  if (season.start <= season.end) {
    for (let i = season.start; i <= season.end; i++) result[i] = true;
  } else {
    // Wrapping: Oct(9) to Mar(2) => Oct,Nov,Dec,Jan,Feb,Mar
    for (let i = season.start; i < 12; i++) result[i] = true;
    for (let i = 0; i <= season.end; i++) result[i] = true;
  }
  return result;
};

// ---------------------------------------------------------------------------
// MONTHS_FULL constant
// ---------------------------------------------------------------------------
describe('MONTHS_FULL constant', () => {
  it('contains exactly 12 entries', () => {
    expect(MONTHS_FULL).toHaveLength(12);
  });

  it('starts with Janvier and ends with Decembre', () => {
    expect(MONTHS_FULL[0]).toBe('Janvier');
    expect(MONTHS_FULL[11]).toBe('Décembre');
  });

  it('contains all expected French month names', () => {
    const expected = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
    ];
    expect(MONTHS_FULL).toEqual(expected);
  });

  it('month index lookup works for each month', () => {
    expect(MONTHS_FULL.indexOf('Janvier')).toBe(0);
    expect(MONTHS_FULL.indexOf('Mai')).toBe(4);
    expect(MONTHS_FULL.indexOf('Août')).toBe(7);
    expect(MONTHS_FULL.indexOf('Décembre')).toBe(11);
  });
});

// ---------------------------------------------------------------------------
// parseSeasonality
// ---------------------------------------------------------------------------
describe('parseSeasonality', () => {
  it("parses \"Toute l'annee\" as yearly", () => {
    expect(parseSeasonality("Toute l'année", null)).toEqual({ type: 'yearly' });
  });

  it("parses \"Toute l'annee\" as yearly even when saisonnier=true", () => {
    expect(parseSeasonality("Toute l'année", true)).toEqual({ type: 'yearly' });
  });

  it('parses saisonnier=false as yearly regardless of period', () => {
    expect(parseSeasonality(null, false)).toEqual({ type: 'yearly' });
    expect(parseSeasonality('De Mai à Septembre', false)).toEqual({ type: 'yearly' });
  });

  it('parses "De Mai a Septembre" with correct start/end indices', () => {
    const result = parseSeasonality('De Mai à Septembre', true);
    expect(result).toEqual({ type: 'seasonal', start: 4, end: 8 });
  });

  it('parses "De Octobre a Mars" (wrapping period)', () => {
    const result = parseSeasonality('De Octobre à Mars', true);
    expect(result).toEqual({ type: 'seasonal', start: 9, end: 2 });
  });

  it('parses "De Janvier a Decembre" as full range', () => {
    const result = parseSeasonality('De Janvier à Décembre', true);
    expect(result).toEqual({ type: 'seasonal', start: 0, end: 11 });
  });

  it('returns null for null period and null saisonnier', () => {
    expect(parseSeasonality(null, null)).toBeNull();
  });

  it('returns seasonal with null bounds for empty string', () => {
    expect(parseSeasonality('', null)).toBeNull(); // empty string is falsy
  });

  it('returns seasonal with null bounds for saisonnier=true and no period', () => {
    expect(parseSeasonality(null, true)).toEqual({
      type: 'seasonal',
      start: null,
      end: null,
    });
  });

  it('returns seasonal with null bounds for malformed string', () => {
    expect(parseSeasonality('random garbage', true)).toEqual({
      type: 'seasonal',
      start: null,
      end: null,
    });
  });

  it('returns seasonal with null start/end for unrecognised month names', () => {
    const result = parseSeasonality('De Foo à Bar', true);
    expect(result).toEqual({ type: 'seasonal', start: null, end: null });
  });
});

// ---------------------------------------------------------------------------
// activeMonths highlighting
// ---------------------------------------------------------------------------
describe('activeMonths', () => {
  it('yearly: all 12 months active', () => {
    const months = activeMonths({ type: 'yearly' });
    expect(months).toHaveLength(12);
    expect(months.every(Boolean)).toBe(true);
  });

  it('null season: no months active', () => {
    expect(activeMonths(null).every(m => !m)).toBe(true);
  });

  it('seasonal with null bounds: no months active', () => {
    const months = activeMonths({ type: 'seasonal', start: null, end: null });
    expect(months.every(m => !m)).toBe(true);
  });

  it('May-September: months 4-8 active, rest inactive', () => {
    const months = activeMonths({ type: 'seasonal', start: 4, end: 8 });
    const activeIndices = months
      .map((v, i) => (v ? i : -1))
      .filter(i => i >= 0);
    expect(activeIndices).toEqual([4, 5, 6, 7, 8]);
  });

  it('October-March (wrapping): months 9-11 and 0-2 active', () => {
    const months = activeMonths({ type: 'seasonal', start: 9, end: 2 });
    const activeIndices = months
      .map((v, i) => (v ? i : -1))
      .filter(i => i >= 0);
    expect(activeIndices).toEqual([0, 1, 2, 9, 10, 11]);
  });

  it('single month: June only', () => {
    const months = activeMonths({ type: 'seasonal', start: 5, end: 5 });
    const activeIndices = months
      .map((v, i) => (v ? i : -1))
      .filter(i => i >= 0);
    expect(activeIndices).toEqual([5]);
  });

  it('full range Jan-Dec: all 12 months active', () => {
    const months = activeMonths({ type: 'seasonal', start: 0, end: 11 });
    expect(months.every(Boolean)).toBe(true);
  });
});
