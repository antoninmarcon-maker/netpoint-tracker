import { describe, it, expect } from 'vitest';
import { getTypeLabel, calcAverageRating, SPOT_TYPE_CONFIG, MONTHS_SHORT, MONTHS_FULL } from '@/lib/spotTypes';

describe('getTypeLabel', () => {
  it('returns emoji + label for known types', () => {
    expect(getTypeLabel('beach')).toBe('🏖️ Beach');
    expect(getTypeLabel('club')).toBe('🏛️ Club');
    expect(getTypeLabel('green_volley')).toBe('🌿 Green-Volley');
    expect(getTypeLabel('outdoor_hard')).toBe('☀️ Dur');
    expect(getTypeLabel('outdoor_grass')).toBe('🌱 Herbe');
  });

  it('returns fallback for unknown type', () => {
    expect(getTypeLabel('indoor')).toBe('📍 Terrain');
    expect(getTypeLabel('')).toBe('📍 Terrain');
    expect(getTypeLabel('nonexistent')).toBe('📍 Terrain');
  });
});

describe('calcAverageRating', () => {
  it('returns 0 for empty comments', () => {
    expect(calcAverageRating([])).toBe(0);
  });

  it('returns 0 when all ratings are null', () => {
    expect(calcAverageRating([{ rating: null }, { rating: null }])).toBe(0);
  });

  it('returns 0 when all ratings are 0 (treated as no rating)', () => {
    expect(calcAverageRating([{ rating: 0 }, { rating: 0 }])).toBe(0);
  });

  it('returns 0 when all ratings are undefined', () => {
    expect(calcAverageRating([{}, {}])).toBe(0);
  });

  it('calculates average ignoring null/0/undefined ratings', () => {
    const comments = [
      { rating: 5 },
      { rating: null },
      { rating: 3 },
      { rating: 0 },
      {},
    ];
    expect(calcAverageRating(comments)).toBe(4); // (5 + 3) / 2
  });

  it('returns exact value for single rating', () => {
    expect(calcAverageRating([{ rating: 4 }])).toBe(4);
  });

  it('handles all valid ratings', () => {
    const comments = [{ rating: 1 }, { rating: 2 }, { rating: 3 }, { rating: 4 }, { rating: 5 }];
    expect(calcAverageRating(comments)).toBe(3); // 15 / 5
  });

  it('handles decimal averages', () => {
    const result = calcAverageRating([{ rating: 4 }, { rating: 5 }]);
    expect(result).toBe(4.5);
  });

  it('never returns NaN', () => {
    const cases = [[], [{}], [{ rating: null }], [{ rating: 0 }], [{ rating: undefined }]];
    cases.forEach(c => expect(calcAverageRating(c)).not.toBeNaN());
  });
});

describe('SPOT_TYPE_CONFIG', () => {
  it('has all 5 spot types', () => {
    expect(Object.keys(SPOT_TYPE_CONFIG)).toHaveLength(5);
    expect(SPOT_TYPE_CONFIG).toHaveProperty('club');
    expect(SPOT_TYPE_CONFIG).toHaveProperty('beach');
    expect(SPOT_TYPE_CONFIG).toHaveProperty('green_volley');
    expect(SPOT_TYPE_CONFIG).toHaveProperty('outdoor_hard');
    expect(SPOT_TYPE_CONFIG).toHaveProperty('outdoor_grass');
  });

  it('each type has emoji, label, bg, hex', () => {
    Object.values(SPOT_TYPE_CONFIG).forEach(config => {
      expect(config.emoji).toBeTruthy();
      expect(config.label).toBeTruthy();
      expect(config.bg).toMatch(/^bg-/);
      expect(config.hex).toMatch(/^#[0-9a-f]{6}$/);
    });
  });
});

describe('Month constants', () => {
  it('MONTHS_SHORT has 12 entries', () => {
    expect(MONTHS_SHORT).toHaveLength(12);
  });

  it('MONTHS_FULL has 12 entries', () => {
    expect(MONTHS_FULL).toHaveLength(12);
  });

  it('months are in order', () => {
    expect(MONTHS_SHORT[0]).toBe('Jan');
    expect(MONTHS_SHORT[11]).toBe('Déc');
    expect(MONTHS_FULL[0]).toBe('Janvier');
    expect(MONTHS_FULL[11]).toBe('Décembre');
  });
});
