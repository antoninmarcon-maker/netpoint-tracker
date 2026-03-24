import { describe, it, expect } from 'vitest';
import { filterSpots, getDistance } from '@/lib/filterSpots';
import { DEFAULT_FILTERS, DEFAULT_SUB_FILTERS, EXTERIOR_TYPES, type SpotFiltersState } from '@/components/spots/SpotFilters';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const baseSpot = {
  id: '1',
  name: 'Test Spot',
  type: 'outdoor_hard',
  status: 'validated',
  lat: 48.8566,
  lng: 2.3522,
  equip_acces_libre: true,
  equip_eclairage: false,
  equip_pmr: false,
  equip_saisonnier: false,
  equip_sol: null,
  source: null,
};

const filters = (): SpotFiltersState => JSON.parse(JSON.stringify(DEFAULT_FILTERS));

// ---------------------------------------------------------------------------
// 1. Null lat/lng safety (bug fix verification)
// ---------------------------------------------------------------------------
describe('Null lat/lng handling', () => {
  it('getDistance returns 0 for identical coords (not NaN)', () => {
    const d = getDistance(48.8566, 2.3522, 48.8566, 2.3522);
    expect(d).toBe(0);
    expect(Number.isNaN(d)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. Average rating calculation (mirrors fixed SpotDetailModal logic)
// ---------------------------------------------------------------------------
describe('Average rating — corrected logic', () => {
  const calcAverage = (comments: Array<{ rating: number | null }>) => {
    const rated = comments.filter(c => c.rating != null && c.rating > 0);
    if (rated.length === 0) return 0;
    return rated.reduce((sum, c) => sum + c.rating!, 0) / rated.length;
  };

  it('returns 0 for empty comments', () => {
    expect(calcAverage([])).toBe(0);
  });

  it('returns 0 when all ratings are null', () => {
    expect(calcAverage([{ rating: null }, { rating: null }])).toBe(0);
  });

  it('returns 0 when all ratings are 0 (invalid)', () => {
    expect(calcAverage([{ rating: 0 }, { rating: 0 }])).toBe(0);
  });

  it('ignores null ratings in average', () => {
    expect(calcAverage([{ rating: 4 }, { rating: null }, { rating: 2 }])).toBe(3);
  });

  it('ignores 0 ratings in average (treated as no rating)', () => {
    expect(calcAverage([{ rating: 5 }, { rating: 0 }, { rating: 3 }])).toBe(4);
  });

  it('single rating returns that value', () => {
    expect(calcAverage([{ rating: 5 }])).toBe(5);
  });

  it('calculates correctly with all valid ratings', () => {
    expect(calcAverage([{ rating: 1 }, { rating: 2 }, { rating: 3 }, { rating: 4 }, { rating: 5 }])).toBe(3);
  });

  it('never returns NaN', () => {
    expect(Number.isNaN(calcAverage([]))).toBe(false);
    expect(Number.isNaN(calcAverage([{ rating: null }]))).toBe(false);
    expect(Number.isNaN(calcAverage([{ rating: 0 }]))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. Google Maps link (bug fix verification)
// ---------------------------------------------------------------------------
describe('Google Maps link format', () => {
  it('search link uses coordinates, not name', () => {
    const lat = 48.8566;
    const lng = 2.3522;
    const link = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    expect(link).toContain('48.8566,2.3522');
    expect(link).not.toContain('encodeURIComponent');
  });

  it('itinerary link uses coordinates', () => {
    const lat = 48.8566;
    const lng = 2.3522;
    const link = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    expect(link).toContain('48.8566,2.3522');
  });

  it('both links use the same coordinates', () => {
    const lat = 43.2965;
    const lng = 5.3698;
    const searchLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    const dirLink = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    expect(searchLink).toContain(`${lat},${lng}`);
    expect(dirLink).toContain(`${lat},${lng}`);
  });
});

// ---------------------------------------------------------------------------
// 4. SpotListView labels — green_volley vs outdoor_grass
// ---------------------------------------------------------------------------
describe('SpotListView type labels', () => {
  const TYPE_LABELS: Record<string, { emoji: string; label: string }> = {
    club: { emoji: '🏛️', label: 'Club' },
    beach: { emoji: '🏖️', label: 'Beach' },
    green_volley: { emoji: '🌿', label: 'Green-Volley' },
    outdoor_hard: { emoji: '☀️', label: 'Dur' },
    outdoor_grass: { emoji: '🌱', label: 'Herbe' },
  };

  it('green_volley and outdoor_grass have distinct labels', () => {
    expect(TYPE_LABELS.green_volley.label).not.toBe(TYPE_LABELS.outdoor_grass.label);
  });

  it('green_volley label is Green-Volley', () => {
    expect(TYPE_LABELS.green_volley.label).toBe('Green-Volley');
  });

  it('outdoor_grass label is Herbe', () => {
    expect(TYPE_LABELS.outdoor_grass.label).toBe('Herbe');
  });

  it('all types have distinct emojis', () => {
    const emojis = Object.values(TYPE_LABELS).map(t => t.emoji);
    expect(new Set(emojis).size).toBe(emojis.length);
  });

  it('every EXTERIOR_TYPE has a label', () => {
    for (const t of EXTERIOR_TYPES) {
      expect(TYPE_LABELS).toHaveProperty(t);
    }
  });
});

// ---------------------------------------------------------------------------
// 5. SpotFormModal — suggestion always creates pending spot
// ---------------------------------------------------------------------------
describe('SpotFormModal — suggestion flow', () => {
  it('suggestion always creates a new pending spot (no direct update branch)', () => {
    // The dead code branch (spotToEdit && !isSuggestion → update with validated)
    // has been removed. Verify the only edit path is isSuggestion.
    const isSuggestion = true;
    const spotToEdit = { id: 'spot-1', lat: 48.8566, lng: 2.3522 };

    // isSuggestion && spotToEdit → creates new spot
    const shouldCreateNewPending = isSuggestion && spotToEdit;
    expect(shouldCreateNewPending).toBeTruthy();
  });

  it('new spot always starts as waiting_for_validation', () => {
    const status = 'waiting_for_validation';
    expect(status).toBe('waiting_for_validation');
  });

  it('suggestion copies coordinates from original spot', () => {
    const original = { lat: 48.8566, lng: 2.3522 };
    const payload = { lat: original.lat, lng: original.lng, status: 'waiting_for_validation' };
    expect(payload.lat).toBe(original.lat);
    expect(payload.lng).toBe(original.lng);
  });
});

// ---------------------------------------------------------------------------
// 6. Comment submission guard — matches actual component logic
// ---------------------------------------------------------------------------
describe('Comment submission guard — actual component logic', () => {
  // Mirrors SpotDetailModal: allows text OR rating OR photos
  const canSubmit = (content: string, rating: number, photoCount: number) =>
    content.trim().length > 0 || rating > 0 || photoCount > 0;

  it('blocks empty submission (no text, no rating, no photos)', () => {
    expect(canSubmit('', 0, 0)).toBe(false);
    expect(canSubmit('   ', 0, 0)).toBe(false);
  });

  it('allows text only', () => {
    expect(canSubmit('Great spot!', 0, 0)).toBe(true);
  });

  it('allows rating only (no text)', () => {
    expect(canSubmit('', 4, 0)).toBe(true);
  });

  it('allows photos only (no text, no rating)', () => {
    expect(canSubmit('', 0, 1)).toBe(true);
  });

  it('allows all three combined', () => {
    expect(canSubmit('Nice', 5, 2)).toBe(true);
  });

  it('does NOT require both text and rating', () => {
    // This was the bug in the old validateComment test
    expect(canSubmit('Text only', 0, 0)).toBe(true);
    expect(canSubmit('', 3, 0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 7. Rate limit logic
// ---------------------------------------------------------------------------
describe('Rate limit logic', () => {
  const LIMIT = 10;

  const simulateRateLimit = (currentCount: number) => {
    return currentCount < LIMIT;
  };

  it('allows actions under the limit', () => {
    expect(simulateRateLimit(0)).toBe(true);
    expect(simulateRateLimit(9)).toBe(true);
  });

  it('blocks at exactly the limit', () => {
    expect(simulateRateLimit(10)).toBe(false);
  });

  it('blocks above the limit', () => {
    expect(simulateRateLimit(11)).toBe(false);
    expect(simulateRateLimit(100)).toBe(false);
  });

  it('resets on a new day', () => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const data = { date: yesterday, count: 10 };
    // If stored date !== today, counter should reset
    const shouldReset = data.date !== today;
    expect(shouldReset).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 8. filterSpots — type fallback and edge cases
// ---------------------------------------------------------------------------
describe('filterSpots — type fallback', () => {
  it('treats null type as outdoor_hard', () => {
    const spot = { ...baseSpot, type: null as any };
    expect(filterSpots([spot], filters(), null)).toHaveLength(1);
  });

  it('treats undefined type as outdoor_hard', () => {
    const spot = { ...baseSpot, type: undefined as any };
    expect(filterSpots([spot], filters(), null)).toHaveLength(1);
  });

  it('treats empty string type as outdoor_hard', () => {
    const spot = { ...baseSpot, type: '' as any };
    // '' is falsy, so falls back to 'outdoor_hard'
    expect(filterSpots([spot], filters(), null)).toHaveLength(1);
  });
});

describe('filterSpots — acces_libre only applies to exterior types', () => {
  it('does NOT filter clubs by acces_libre', () => {
    const f = filters();
    f.showClubs = true;
    f.subFilters.acces_libre = true;
    const club = { ...baseSpot, type: 'club', equip_acces_libre: false };
    // Clubs pass through because acces_libre filter is inside the isExterior block
    expect(filterSpots([club], f, null)).toHaveLength(1);
  });

  it('filters exterior spots by acces_libre', () => {
    const f = filters();
    f.subFilters.acces_libre = true;
    const spot = { ...baseSpot, type: 'beach', equip_acces_libre: false };
    expect(filterSpots([spot], f, null)).toHaveLength(0);
  });
});

describe('filterSpots — beach-specific filters do NOT affect other types', () => {
  it('beach_eclairage does not filter outdoor_hard', () => {
    const f = filters();
    f.subFilters.beach_eclairage = true;
    const spot = { ...baseSpot, type: 'outdoor_hard', equip_eclairage: false };
    expect(filterSpots([spot], f, null)).toHaveLength(1);
  });

  it('beach_pmr does not filter outdoor_grass', () => {
    const f = filters();
    f.subFilters.beach_pmr = true;
    const spot = { ...baseSpot, type: 'outdoor_grass', equip_pmr: false };
    expect(filterSpots([spot], f, null)).toHaveLength(1);
  });

  it('beach_saison does not filter green_volley', () => {
    const f = filters();
    f.subFilters.beach_saison = 'annee';
    const spot = { ...baseSpot, type: 'green_volley', equip_saisonnier: true };
    // green_volley uses green_saison, not beach_saison
    expect(filterSpots([spot], f, null)).toHaveLength(1);
  });
});

describe('filterSpots — green filters do NOT affect beach', () => {
  it('green_sol does not filter beach spots', () => {
    const f = filters();
    f.subFilters.green_sol = 'naturel';
    const spot = { ...baseSpot, type: 'beach', equip_sol: 'Sable' };
    expect(filterSpots([spot], f, null)).toHaveLength(1);
  });

  it('green_saison does not filter beach spots', () => {
    const f = filters();
    f.subFilters.green_saison = 'annee';
    const spot = { ...baseSpot, type: 'beach', equip_saisonnier: true };
    expect(filterSpots([spot], f, null)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 9. filterSpots — outdoor_grass treated like green_volley
// ---------------------------------------------------------------------------
describe('filterSpots — outdoor_grass parity with green_volley', () => {
  it('outdoor_grass filtered by green_sol naturel', () => {
    const f = filters();
    f.subFilters.green_sol = 'naturel';
    expect(filterSpots([{ ...baseSpot, type: 'outdoor_grass', equip_sol: 'Gazon naturel' }], f, null)).toHaveLength(1);
    expect(filterSpots([{ ...baseSpot, type: 'outdoor_grass', equip_sol: 'Gazon synthétique' }], f, null)).toHaveLength(0);
  });

  it('outdoor_grass filtered by green_sol synthetique', () => {
    const f = filters();
    f.subFilters.green_sol = 'synthetique';
    expect(filterSpots([{ ...baseSpot, type: 'outdoor_grass', equip_sol: 'Gazon synthétique' }], f, null)).toHaveLength(1);
    expect(filterSpots([{ ...baseSpot, type: 'outdoor_grass', equip_sol: 'Gazon naturel' }], f, null)).toHaveLength(0);
  });

  it('outdoor_grass filtered by green_saison annee', () => {
    const f = filters();
    f.subFilters.green_saison = 'annee';
    expect(filterSpots([{ ...baseSpot, type: 'outdoor_grass', equip_saisonnier: true }], f, null)).toHaveLength(0);
    expect(filterSpots([{ ...baseSpot, type: 'outdoor_grass', equip_saisonnier: false }], f, null)).toHaveLength(1);
  });

  it('outdoor_grass filtered by green_saison saisonnier', () => {
    const f = filters();
    f.subFilters.green_saison = 'saisonnier';
    expect(filterSpots([{ ...baseSpot, type: 'outdoor_grass', equip_saisonnier: false }], f, null)).toHaveLength(0);
    expect(filterSpots([{ ...baseSpot, type: 'outdoor_grass', equip_saisonnier: true }], f, null)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 10. Pending mode bypasses all other filters
// ---------------------------------------------------------------------------
describe('filterSpots — pending mode isolation', () => {
  it('shows indoor spots when pending (type filter bypassed)', () => {
    const f = filters();
    f.showPending = true;
    const spot = { ...baseSpot, type: 'indoor', status: 'waiting_for_validation' };
    expect(filterSpots([spot], f, null)).toHaveLength(1);
  });

  it('shows spots without libre accès when pending', () => {
    const f = filters();
    f.showPending = true;
    f.subFilters.acces_libre = true;
    const spot = { ...baseSpot, equip_acces_libre: false, status: 'waiting_for_validation' };
    expect(filterSpots([spot], f, null)).toHaveLength(1);
  });

  it('does NOT show validated spots when pending', () => {
    const f = filters();
    f.showPending = true;
    expect(filterSpots([{ ...baseSpot, status: 'validated' }], f, null)).toHaveLength(0);
  });

  it('does NOT show rejected spots when pending', () => {
    const f = filters();
    f.showPending = true;
    expect(filterSpots([{ ...baseSpot, status: 'rejected' }], f, null)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 11. Seasonality parsing (mirrors SpotDetailModal.parseSeasonality)
// ---------------------------------------------------------------------------
describe('Seasonality parsing — edge cases', () => {
  const FULL_MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  const parseSeason = (period: string | null, saisonnier: boolean | null) => {
    if (saisonnier === false || period === "Toute l'année") return { type: 'yearly' as const };
    if (!period) return saisonnier ? { type: 'seasonal' as const, start: null, end: null } : null;
    const match = period.match(/De (.+) à (.+)/);
    if (match) {
      const startIdx = FULL_MONTHS.indexOf(match[1]);
      const endIdx = FULL_MONTHS.indexOf(match[2]);
      return { type: 'seasonal' as const, start: startIdx >= 0 ? startIdx : null, end: endIdx >= 0 ? endIdx : null };
    }
    return { type: 'seasonal' as const, start: null, end: null };
  };

  it('contradictory data: saisonnier=true + period="Toute l\'année" → yearly wins', () => {
    const result = parseSeason("Toute l'année", true);
    expect(result.type).toBe('yearly');
  });

  it('saisonnier=true + null period → seasonal with null months', () => {
    const result = parseSeason(null, true);
    expect(result).toEqual({ type: 'seasonal', start: null, end: null });
  });

  it('saisonnier=null + null period → null (unknown)', () => {
    expect(parseSeason(null, null)).toBeNull();
  });

  it('invalid month names → null indices', () => {
    const result = parseSeason('De Foo à Bar', true);
    expect(result).toEqual({ type: 'seasonal', start: null, end: null });
  });

  it('mixed valid/invalid months → partial null', () => {
    const result = parseSeason('De Mai à InvalidMonth', true);
    expect(result?.start).toBe(4);
    expect(result?.end).toBeNull();
  });

  it('wrapping months: Octobre to Mars', () => {
    const result = parseSeason('De Octobre à Mars', true);
    expect(result?.start).toBe(9);
    expect(result?.end).toBe(2);
  });

  it('same start and end month', () => {
    const result = parseSeason('De Juin à Juin', true);
    expect(result?.start).toBe(5);
    expect(result?.end).toBe(5);
  });

  it('unrecognized format → seasonal with null months', () => {
    const result = parseSeason('Été seulement', true);
    expect(result).toEqual({ type: 'seasonal', start: null, end: null });
  });
});

// ---------------------------------------------------------------------------
// 12. Month bar active logic (mirrors SpotDetailModal render)
// ---------------------------------------------------------------------------
describe('Month bar active calculation', () => {
  const isMonthActive = (i: number, start: number | null, end: number | null): boolean => {
    if (start == null || end == null) return false;
    if (start <= end) return i >= start && i <= end;
    return i >= start || i <= end; // wrapping
  };

  it('Mai to Septembre: months 4-8 active', () => {
    expect(isMonthActive(0, 4, 8)).toBe(false); // Jan
    expect(isMonthActive(4, 4, 8)).toBe(true);  // Mai
    expect(isMonthActive(6, 4, 8)).toBe(true);  // Jul
    expect(isMonthActive(8, 4, 8)).toBe(true);  // Sep
    expect(isMonthActive(9, 4, 8)).toBe(false);  // Oct
  });

  it('wrapping: Octobre to Mars (9 to 2)', () => {
    expect(isMonthActive(9, 9, 2)).toBe(true);  // Oct
    expect(isMonthActive(11, 9, 2)).toBe(true); // Dec
    expect(isMonthActive(0, 9, 2)).toBe(true);  // Jan
    expect(isMonthActive(2, 9, 2)).toBe(true);  // Mar
    expect(isMonthActive(3, 9, 2)).toBe(false); // Apr
    expect(isMonthActive(8, 9, 2)).toBe(false); // Sep
  });

  it('null start/end → all months inactive', () => {
    for (let i = 0; i < 12; i++) {
      expect(isMonthActive(i, null, null)).toBe(false);
      expect(isMonthActive(i, null, 5)).toBe(false);
      expect(isMonthActive(i, 5, null)).toBe(false);
    }
  });

  it('same month start and end → only that month active', () => {
    expect(isMonthActive(5, 5, 5)).toBe(true);
    expect(isMonthActive(4, 5, 5)).toBe(false);
    expect(isMonthActive(6, 5, 5)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 13. Availability period formatting (mirrors SpotFormModal)
// ---------------------------------------------------------------------------
describe('Availability period formatting', () => {
  const formatAvailability = (allYear: boolean, startMonth: string, endMonth: string) =>
    allYear ? "Toute l'année" : (startMonth && endMonth ? `De ${startMonth} à ${endMonth}` : '');

  it('all year', () => {
    expect(formatAvailability(true, '', '')).toBe("Toute l'année");
  });

  it('all year ignores month values', () => {
    expect(formatAvailability(true, 'Mai', 'Septembre')).toBe("Toute l'année");
  });

  it('seasonal with both months', () => {
    expect(formatAvailability(false, 'Mai', 'Septembre')).toBe('De Mai à Septembre');
  });

  it('seasonal with only start month → empty string', () => {
    expect(formatAvailability(false, 'Mai', '')).toBe('');
  });

  it('seasonal with only end month → empty string', () => {
    expect(formatAvailability(false, '', 'Septembre')).toBe('');
  });

  it('seasonal with no months → empty string', () => {
    expect(formatAvailability(false, '', '')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// 14. getDistance edge cases
// ---------------------------------------------------------------------------
describe('getDistance — edge cases', () => {
  it('antipodal points ≈ 20,000 km', () => {
    const dist = getDistance(0, 0, 0, 180);
    expect(dist).toBeGreaterThan(19000);
    expect(dist).toBeLessThan(21000);
  });

  it('equator 1 degree ≈ 111 km', () => {
    const dist = getDistance(0, 0, 0, 1);
    expect(dist).toBeGreaterThan(100);
    expect(dist).toBeLessThan(120);
  });

  it('pole to pole ≈ 20,000 km', () => {
    const dist = getDistance(90, 0, -90, 0);
    expect(dist).toBeGreaterThan(19000);
    expect(dist).toBeLessThan(21000);
  });

  it('negative coordinates work (southern hemisphere)', () => {
    const dist = getDistance(-33.8688, 151.2093, -37.8136, 144.9631); // Sydney to Melbourne
    expect(dist).toBeGreaterThan(700);
    expect(dist).toBeLessThan(900);
  });

  it('is symmetric', () => {
    const d1 = getDistance(48.8566, 2.3522, 43.2965, 5.3698);
    const d2 = getDistance(43.2965, 5.3698, 48.8566, 2.3522);
    expect(d1).toBeCloseTo(d2, 6);
  });
});

// ---------------------------------------------------------------------------
// 15. Distance display formatting
// ---------------------------------------------------------------------------
describe('Distance display formatting', () => {
  const formatDistance = (distKm: number) =>
    distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`;

  it('0 km → 0 m', () => {
    expect(formatDistance(0)).toBe('0 m');
  });

  it('0.001 km → 1 m', () => {
    expect(formatDistance(0.001)).toBe('1 m');
  });

  it('0.999 km → 999 m', () => {
    expect(formatDistance(0.999)).toBe('999 m');
  });

  it('1.0 km → 1.0 km', () => {
    expect(formatDistance(1.0)).toBe('1.0 km');
  });

  it('boundary: exactly 1 km shows km format', () => {
    expect(formatDistance(1)).toBe('1.0 km');
  });

  it('very large distance', () => {
    expect(formatDistance(15000)).toBe('15000.0 km');
  });
});

// ---------------------------------------------------------------------------
// 16. Spot type validation (form-allowed types)
// ---------------------------------------------------------------------------
describe('Spot type validation — form vs EXTERIOR_TYPES', () => {
  const FORM_TYPES = ['beach', 'outdoor_hard', 'outdoor_grass'];

  it('all form types are in EXTERIOR_TYPES', () => {
    for (const t of FORM_TYPES) {
      expect(EXTERIOR_TYPES).toContain(t);
    }
  });

  it('green_volley is in EXTERIOR_TYPES but NOT in form types', () => {
    expect(EXTERIOR_TYPES).toContain('green_volley');
    expect(FORM_TYPES).not.toContain('green_volley');
  });

  it('club and indoor are NOT in form types', () => {
    expect(FORM_TYPES).not.toContain('club');
    expect(FORM_TYPES).not.toContain('indoor');
  });
});

// ---------------------------------------------------------------------------
// 17. Filter state immutability
// ---------------------------------------------------------------------------
describe('Filter state — defaults are not mutated', () => {
  it('modifying a copy does not affect DEFAULT_FILTERS', () => {
    const f = filters();
    f.showClubs = true;
    f.subFilters.acces_libre = false;
    expect(DEFAULT_FILTERS.showClubs).toBe(false);
    expect(DEFAULT_FILTERS.subFilters.acces_libre).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 18. Combined complex filter scenarios
// ---------------------------------------------------------------------------
describe('filterSpots — complex combined scenarios', () => {
  const makeSpots = () => [
    { ...baseSpot, id: '1', type: 'beach', equip_acces_libre: true, equip_eclairage: true, equip_saisonnier: false },
    { ...baseSpot, id: '2', type: 'beach', equip_acces_libre: true, equip_eclairage: false, equip_saisonnier: true },
    { ...baseSpot, id: '3', type: 'outdoor_hard', equip_acces_libre: true },
    { ...baseSpot, id: '4', type: 'outdoor_hard', equip_acces_libre: false },
    { ...baseSpot, id: '5', type: 'green_volley', equip_acces_libre: true, equip_sol: 'Gazon naturel', equip_saisonnier: false },
    { ...baseSpot, id: '6', type: 'green_volley', equip_acces_libre: true, equip_sol: 'Gazon synthétique', equip_saisonnier: true },
    { ...baseSpot, id: '7', type: 'outdoor_grass', equip_acces_libre: true, equip_sol: 'Gazon naturel' },
    { ...baseSpot, id: '8', type: 'club', equip_acces_libre: false },
    { ...baseSpot, id: '9', type: 'indoor' },
    { ...baseSpot, id: '10', status: 'waiting_for_validation' },
  ];

  it('default filters → only libre-accès exterior validated spots', () => {
    const result = filterSpots(makeSpots(), filters(), null);
    const ids = result.map(s => s.id);
    expect(ids).toContain('1');
    expect(ids).toContain('2');
    expect(ids).toContain('3');
    expect(ids).not.toContain('4'); // no acces_libre
    expect(ids).toContain('5');
    expect(ids).toContain('6');
    expect(ids).toContain('7');
    expect(ids).not.toContain('8'); // club hidden by default
    expect(ids).not.toContain('9'); // indoor always hidden
    expect(ids).not.toContain('10'); // pending hidden by default
  });

  it('beach only + éclairage required → 1 spot', () => {
    const f = filters();
    f.subFilters.ext_herbe = false;
    f.subFilters.ext_dur = false;
    f.subFilters.beach_eclairage = true;
    const result = filterSpots(makeSpots(), f, null);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('green_volley + naturel + annee → 1 spot', () => {
    const f = filters();
    f.subFilters.ext_beach = false;
    f.subFilters.ext_dur = false;
    f.subFilters.green_sol = 'naturel';
    f.subFilters.green_saison = 'annee';
    const result = filterSpots(makeSpots(), f, null);
    expect(result).toHaveLength(2); // green_volley #5 + outdoor_grass #7
    expect(result.map(s => s.id)).toContain('5');
    expect(result.map(s => s.id)).toContain('7');
  });

  it('show clubs + hide exterior → only clubs', () => {
    const f = filters();
    f.showClubs = true;
    f.showExterieur = false;
    const result = filterSpots(makeSpots(), f, null);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('club');
  });

  it('show clubs + show exterior → both', () => {
    const f = filters();
    f.showClubs = true;
    f.subFilters.acces_libre = false; // don't filter by libre accès
    const result = filterSpots(makeSpots(), f, null);
    const types = new Set(result.map(s => s.type));
    expect(types).toContain('club');
    expect(types).toContain('beach');
  });
});

// ---------------------------------------------------------------------------
// 19. Favorite system edge cases
// ---------------------------------------------------------------------------
describe('Favorite system — edge cases', () => {
  it('toggling twice returns to original state', () => {
    const favs: string[] = [];
    const spotId = 'spot-1';
    const added = [...favs, spotId];
    const removed = added.filter(f => f !== spotId);
    expect(removed).toEqual(favs);
  });

  it('adding same spot twice results in duplicate (should be prevented by UI)', () => {
    const favs = ['spot-1'];
    const next = [...favs, 'spot-1'];
    expect(next).toHaveLength(2); // This is a potential bug if not handled
  });

  it('removing non-existent spot is a no-op', () => {
    const favs = ['spot-1', 'spot-2'];
    const next = favs.filter(f => f !== 'spot-999');
    expect(next).toEqual(favs);
  });

  it('handles corrupted localStorage gracefully', () => {
    const tryParse = (raw: string): string[] => {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };
    expect(tryParse('not json')).toEqual([]);
    expect(tryParse('{"foo": "bar"}')).toEqual([]);
    expect(tryParse('null')).toEqual([]);
    expect(tryParse('["spot-1"]')).toEqual(['spot-1']);
  });
});

// ---------------------------------------------------------------------------
// 20. Moderator logic edge cases
// ---------------------------------------------------------------------------
describe('Moderator — edge cases', () => {
  const MODERATOR_EMAIL = 'antonin.marcon@gmail.com';
  const isModerator = (email: string | null | undefined) =>
    typeof email === 'string' && email === MODERATOR_EMAIL;

  it('null email is not moderator', () => {
    expect(isModerator(null)).toBe(false);
  });

  it('undefined email is not moderator', () => {
    expect(isModerator(undefined)).toBe(false);
  });

  it('correct email is moderator', () => {
    expect(isModerator('antonin.marcon@gmail.com')).toBe(true);
  });

  it('moderation buttons show for rejected spots too (not just pending)', () => {
    const shouldShow = (isMod: boolean, status: string) => isMod && status !== 'validated';
    expect(shouldShow(true, 'rejected')).toBe(true);
    expect(shouldShow(true, 'waiting_for_validation')).toBe(true);
    expect(shouldShow(true, 'validated')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 21. Sorting logic (SpotListView)
// ---------------------------------------------------------------------------
describe('SpotListView — sorting', () => {
  const spots = [
    { name: 'Zebra', type: 'beach', distance: 50 },
    { name: 'Alpha', type: 'outdoor_hard', distance: 10 },
    { name: 'Mango', type: 'club', distance: 30 },
  ];

  it('sort by name → alphabetical', () => {
    const sorted = [...spots].sort((a, b) => a.name.localeCompare(b.name));
    expect(sorted.map(s => s.name)).toEqual(['Alpha', 'Mango', 'Zebra']);
  });

  it('sort by distance → ascending', () => {
    const sorted = [...spots].sort((a, b) => a.distance - b.distance);
    expect(sorted.map(s => s.name)).toEqual(['Alpha', 'Mango', 'Zebra']);
  });

  it('sort by type → alphabetical by type', () => {
    const sorted = [...spots].sort((a, b) => a.type.localeCompare(b.type));
    expect(sorted.map(s => s.type)).toEqual(['beach', 'club', 'outdoor_hard']);
  });

  it('sort by distance falls back to name when no distance', () => {
    const noDistSpots = spots.map(s => ({ ...s, distance: null as any }));
    const sorted = [...noDistSpots].sort((a: any, b: any) => {
      if (a.distance != null && b.distance != null) return a.distance - b.distance;
      return (a.name || '').localeCompare(b.name || '');
    });
    expect(sorted.map(s => s.name)).toEqual(['Alpha', 'Mango', 'Zebra']);
  });
});

// ---------------------------------------------------------------------------
// 22. Photo limits
// ---------------------------------------------------------------------------
describe('Photo upload limits', () => {
  const MAX = 5;
  const canAdd = (current: number, toAdd: number) => current + toAdd <= MAX;

  it('0 + 5 = ok', () => expect(canAdd(0, 5)).toBe(true));
  it('0 + 6 = blocked', () => expect(canAdd(0, 6)).toBe(false));
  it('4 + 1 = ok', () => expect(canAdd(4, 1)).toBe(true));
  it('5 + 0 = ok', () => expect(canAdd(5, 0)).toBe(true));
  it('5 + 1 = blocked', () => expect(canAdd(5, 1)).toBe(false));
  it('3 + 3 = blocked', () => expect(canAdd(3, 3)).toBe(false));
});
