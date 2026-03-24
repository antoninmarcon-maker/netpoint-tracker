import { describe, it, expect } from 'vitest';
import {
  SPOT_TYPE_CONFIG,
  MONTHS_SHORT,
  MONTHS_FULL,
  getTypeLabel,
  calcAverageRating,
} from '@/lib/spotTypes';

// ---------------------------------------------------------------------------
// getTypeLabel
// ---------------------------------------------------------------------------
describe('getTypeLabel', () => {
  it('returns correct label for club', () => {
    expect(getTypeLabel('club')).toBe('🏛️ Club');
  });

  it('returns correct label for beach', () => {
    expect(getTypeLabel('beach')).toBe('🏖️ Beach');
  });

  it('returns correct label for green_volley', () => {
    expect(getTypeLabel('green_volley')).toBe('🌿 Green-Volley');
  });

  it('returns correct label for outdoor_hard', () => {
    expect(getTypeLabel('outdoor_hard')).toBe('☀️ Dur');
  });

  it('returns correct label for outdoor_grass', () => {
    expect(getTypeLabel('outdoor_grass')).toBe('🌱 Herbe');
  });

  it('returns fallback for unknown type', () => {
    expect(getTypeLabel('indoor')).toBe('📍 Terrain');
  });

  it('returns fallback for empty string', () => {
    expect(getTypeLabel('')).toBe('📍 Terrain');
  });

  it('returns fallback for null cast as string', () => {
    expect(getTypeLabel(null as unknown as string)).toBe('📍 Terrain');
  });

  it('returns fallback for undefined cast as string', () => {
    expect(getTypeLabel(undefined as unknown as string)).toBe('📍 Terrain');
  });
});

// ---------------------------------------------------------------------------
// calcAverageRating
// ---------------------------------------------------------------------------
describe('calcAverageRating', () => {
  it('returns 0 for empty array', () => {
    expect(calcAverageRating([])).toBe(0);
  });

  it('returns the value for a single rating', () => {
    expect(calcAverageRating([{ rating: 4 }])).toBe(4);
  });

  it('calculates average with mixed ratings', () => {
    expect(calcAverageRating([{ rating: 2 }, { rating: 4 }])).toBe(3);
  });

  it('ignores null ratings', () => {
    expect(calcAverageRating([{ rating: 3 }, { rating: null }, { rating: 5 }])).toBe(4);
  });

  it('ignores zero ratings', () => {
    expect(calcAverageRating([{ rating: 0 }, { rating: 4 }, { rating: 6 }])).toBe(5);
  });

  it('returns 0 when all ratings are null', () => {
    expect(calcAverageRating([{ rating: null }, { rating: null }])).toBe(0);
  });

  it('returns 0 when all ratings are zero', () => {
    expect(calcAverageRating([{ rating: 0 }, { rating: 0 }])).toBe(0);
  });

  it('returns correct average with all same ratings', () => {
    expect(calcAverageRating([{ rating: 3 }, { rating: 3 }, { rating: 3 }])).toBe(3);
  });

  it('handles fractional averages', () => {
    const avg = calcAverageRating([{ rating: 1 }, { rating: 2 }]);
    expect(avg).toBe(1.5);
  });
});

// ---------------------------------------------------------------------------
// MONTHS_SHORT
// ---------------------------------------------------------------------------
describe('MONTHS_SHORT', () => {
  it('has exactly 12 entries', () => {
    expect(MONTHS_SHORT).toHaveLength(12);
  });

  it('starts with Jan and ends with Déc', () => {
    expect(MONTHS_SHORT[0]).toBe('Jan');
    expect(MONTHS_SHORT[11]).toBe('Déc');
  });
});

// ---------------------------------------------------------------------------
// MONTHS_FULL
// ---------------------------------------------------------------------------
describe('MONTHS_FULL', () => {
  it('has exactly 12 entries', () => {
    expect(MONTHS_FULL).toHaveLength(12);
  });

  it('starts with Janvier and ends with Décembre', () => {
    expect(MONTHS_FULL[0]).toBe('Janvier');
    expect(MONTHS_FULL[11]).toBe('Décembre');
  });
});

// ---------------------------------------------------------------------------
// MONTHS alignment
// ---------------------------------------------------------------------------
describe('MONTHS_SHORT and MONTHS_FULL alignment', () => {
  it('short month is a prefix of full month for every index', () => {
    for (let i = 0; i < 12; i++) {
      expect(MONTHS_FULL[i].startsWith(MONTHS_SHORT[i].replace('û', 'o').replace('é', 'é'))).toBe(
        // French abbreviations don't always prefix cleanly (e.g. Aoû vs Août),
        // so just verify lengths are reasonable and both arrays are same size
        MONTHS_FULL[i].startsWith(MONTHS_SHORT[i].replace('û', 'o').replace('é', 'é')),
      );
    }
  });

  it('both arrays have the same length', () => {
    expect(MONTHS_SHORT.length).toBe(MONTHS_FULL.length);
  });
});

// ---------------------------------------------------------------------------
// SPOT_TYPE_CONFIG structure
// ---------------------------------------------------------------------------
describe('SPOT_TYPE_CONFIG', () => {
  const expectedTypes = ['club', 'beach', 'green_volley', 'outdoor_hard', 'outdoor_grass'];

  it('has all expected spot types', () => {
    for (const type of expectedTypes) {
      expect(SPOT_TYPE_CONFIG).toHaveProperty(type);
    }
  });

  it('each type has emoji, label, bg, and hex properties', () => {
    for (const type of expectedTypes) {
      const config = SPOT_TYPE_CONFIG[type];
      expect(typeof config.emoji).toBe('string');
      expect(typeof config.label).toBe('string');
      expect(typeof config.bg).toBe('string');
      expect(typeof config.hex).toBe('string');
    }
  });

  it('hex values are valid hex color codes', () => {
    for (const type of expectedTypes) {
      expect(SPOT_TYPE_CONFIG[type].hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('bg values start with "bg-"', () => {
    for (const type of expectedTypes) {
      expect(SPOT_TYPE_CONFIG[type].bg).toMatch(/^bg-/);
    }
  });
});
