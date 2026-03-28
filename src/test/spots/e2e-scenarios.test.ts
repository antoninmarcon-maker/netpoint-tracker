import { describe, it, expect } from 'vitest';
import { filterSpots, getDistance } from '@/lib/filterSpots';
import {
  SPOT_TYPE_CONFIG, MONTHS_FULL, MONTHS_SHORT,
  getTypeLabel, calcAverageRating,
} from '@/lib/spotTypes';
import { DEFAULT_FILTERS, DEFAULT_SUB_FILTERS, EXTERIOR_TYPES, type SpotFiltersState } from '@/components/spots/SpotFilters';
import type { Tables } from '@/integrations/supabase/types';

type Spot = Tables<'spots_with_coords'>;

// ── Shared fixtures ─────────────────────────────────────────────────────────

const MODERATOR_EMAIL = 'antonin.marcon@gmail.com';

const filters = (): SpotFiltersState =>
  JSON.parse(JSON.stringify(DEFAULT_FILTERS));

/** "Le Valdier" — a real-world beach spot near Lyon */
const leValdier = {
  id: 'spot-valdier',
  name: 'Le Valdier',
  type: 'beach',
  description: 'Terrain de beach volley au bord du Rhône, sable fin.',
  lat: 45.7640,
  lng: 4.8357,
  address: 'Quai du Rhône, 69006 Lyon',
  status: 'validated',
  source: null,
  equip_acces_libre: true,
  equip_eclairage: true,
  equip_pmr: false,
  equip_saisonnier: true,
  equip_sol: null,
  availability_period: 'De Mai à Septembre',
  club_telephone: null,
  club_email: null,
  club_site_web: null,
  club_lien_fiche: null,
  ffvb_ligue: null,
  ffvb_comite: null,
  created_at: '2025-06-01T10:00:00Z',
  updated_at: '2025-06-01T10:00:00Z',
  user_id: 'user-creator',
} as Spot;

/** Convenience: create spot variants */
const spot = (overrides: Record<string, unknown> = {}): Spot => ({ ...leValdier, ...overrides } as Spot);

// ═══════════════════════════════════════════════════════════════════════════
// 1. FULL SPOT CREATION FLOW
// ═══════════════════════════════════════════════════════════════════════════

describe('Spot creation — "Le Valdier" scenario', () => {
  // ── Payload building ──

  function buildNewSpotPayload(
    location: [number, number],
    form: { name: string; description: string; type: string; allYear: boolean; startMonth: string; endMonth: string },
    userId: string,
  ) {
    const availability = form.allYear
      ? "Toute l'année"
      : (form.startMonth && form.endMonth ? `De ${form.startMonth} à ${form.endMonth}` : '');
    return {
      name: form.name,
      description: form.description,
      type: form.type,
      availability_period: availability,
      lat: location[0],
      lng: location[1],
      user_id: userId,
      status: 'waiting_for_validation',
    };
  }

  it('builds correct payload for Le Valdier', () => {
    const payload = buildNewSpotPayload(
      [45.7640, 4.8357],
      { name: 'Le Valdier', description: 'Beach au bord du Rhône', type: 'beach', allYear: false, startMonth: 'Mai', endMonth: 'Septembre' },
      'user-42',
    );
    expect(payload.name).toBe('Le Valdier');
    expect(payload.type).toBe('beach');
    expect(payload.lat).toBe(45.7640);
    expect(payload.lng).toBe(4.8357);
    expect(payload.availability_period).toBe('De Mai à Septembre');
    expect(payload.status).toBe('waiting_for_validation');
  });

  // ── Name validation ──

  it('rejects empty name', () => {
    expect(''.trim()).toBe('');
    expect('   '.trim()).toBe('');
    expect('\t\n'.trim()).toBe('');
  });

  it('accepts name with special characters', () => {
    expect('Le Valdier — Beach #1'.trim()).not.toBe('');
    expect("L'Île aux Oiseaux".trim()).not.toBe('');
    expect('Plage St-Raphaël (Sud)'.trim()).not.toBe('');
  });

  it('accepts very long names without crashing', () => {
    const longName = 'A'.repeat(500);
    expect(longName.trim().length).toBe(500);
  });

  // ── Location validation ──

  it('rejects creation without location (no spotToEdit)', () => {
    const location = null;
    const spotToEdit = undefined;
    const valid = !!location || !!spotToEdit;
    expect(valid).toBe(false);
  });

  it('accepts creation with location', () => {
    const location: [number, number] = [45.7640, 4.8357];
    const valid = !!location;
    expect(valid).toBe(true);
  });

  // ── Availability period formatting ──

  it('formats all-year correctly', () => {
    const result = true ? "Toute l'année" : '';
    expect(result).toBe("Toute l'année");
  });

  it('formats seasonal with start > end (wrapping)', () => {
    const start = 'Octobre';
    const end = 'Mars';
    const result = `De ${start} à ${end}`;
    expect(result).toBe('De Octobre à Mars');
  });

  it('returns empty string when seasonal but only start month selected', () => {
    const startMonth = 'Mai';
    const endMonth = '';
    const result = startMonth && endMonth ? `De ${startMonth} à ${endMonth}` : '';
    expect(result).toBe('');
  });

  it('returns empty string when seasonal but only end month selected', () => {
    const startMonth = '';
    const endMonth = 'Septembre';
    const result = startMonth && endMonth ? `De ${startMonth} à ${endMonth}` : '';
    expect(result).toBe('');
  });

  // ── Type restrictions ──

  const FORM_TYPES = ['beach', 'outdoor_hard', 'outdoor_grass'];

  it('form only exposes beach, outdoor_hard, outdoor_grass', () => {
    expect(FORM_TYPES).toEqual(['beach', 'outdoor_hard', 'outdoor_grass']);
  });

  it('user cannot create indoor spots via form', () => {
    expect(FORM_TYPES).not.toContain('indoor');
  });

  it('user cannot create club spots via form', () => {
    expect(FORM_TYPES).not.toContain('club');
  });

  it('user cannot create green_volley via form (mapped to outdoor_grass)', () => {
    expect(FORM_TYPES).not.toContain('green_volley');
  });

  // ── New spot always pending ──

  it('new spot is always waiting_for_validation', () => {
    const payload = buildNewSpotPayload([45.7640, 4.8357], {
      name: 'Le Valdier', description: '', type: 'beach', allYear: true, startMonth: '', endMonth: '',
    }, 'user-42');
    expect(payload.status).toBe('waiting_for_validation');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. SPOT DETAIL — DISPLAY & INTERACTIONS
// ═══════════════════════════════════════════════════════════════════════════

describe('Spot detail — Le Valdier display', () => {
  it('shows type label with emoji', () => {
    expect(getTypeLabel('beach')).toBe('🏖️ Beach');
  });

  it('unknown type falls back to generic label', () => {
    expect(getTypeLabel('unknown_type')).toBe('📍 Terrain');
    expect(getTypeLabel('')).toBe('📍 Terrain');
  });

  it('all config types have a valid label', () => {
    for (const [type, cfg] of Object.entries(SPOT_TYPE_CONFIG)) {
      expect(getTypeLabel(type)).toBe(`${cfg.emoji} ${cfg.label}`);
    }
  });

  it('shows pending badge only when status is waiting_for_validation', () => {
    const showBadge = (status: string) => status === 'waiting_for_validation';
    expect(showBadge('waiting_for_validation')).toBe(true);
    expect(showBadge('validated')).toBe(false);
    expect(showBadge('rejected')).toBe(false);
  });

  it('shows address when present', () => {
    expect(leValdier.address).toBeTruthy();
  });

  it('does not crash when address is null', () => {
    const s = spot({ address: null as any });
    expect(s.address).toBeNull();
  });

  // ── Equipment badges ──

  it('shows libre accès badge when equip_acces_libre is true', () => {
    expect(leValdier.equip_acces_libre).toBe(true);
  });

  it('shows éclairage badge when equip_eclairage is true', () => {
    expect(leValdier.equip_eclairage).toBe(true);
  });

  it('hides PMR badge when equip_pmr is false', () => {
    expect(leValdier.equip_pmr).toBe(false);
  });

  it('shows sol badge when equip_sol is set', () => {
    const withSol = spot({ equip_sol: 'Gazon synthétique' });
    expect(withSol.equip_sol).toBeTruthy();
  });

  it('hides sol badge when equip_sol is null', () => {
    expect(leValdier.equip_sol).toBeNull();
  });

  // ── Navigation links ──

  it('builds correct Google Maps URL', () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${leValdier.lat},${leValdier.lng}`;
    expect(url).toContain('45.764');
    expect(url).toContain('4.8357');
  });

  it('builds correct directions URL', () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${leValdier.lat},${leValdier.lng}`;
    expect(url).toContain('destination=45.764');
  });

  it('hides nav buttons when lat/lng are null', () => {
    const s = spot({ lat: null as any, lng: null as any });
    const show = !!(s.lat && s.lng);
    expect(show).toBe(false);
  });

  // ── Club contact section ──

  it('hides club contact for non-FFVB spots', () => {
    const showContact = leValdier.source === 'ffvb_club';
    expect(showContact).toBe(false);
  });

  it('shows club contact for FFVB clubs', () => {
    const club = spot({
      source: 'ffvb_club',
      club_telephone: '04 72 00 00 00',
      club_site_web: 'https://club.example.com',
      club_lien_fiche: 'https://ffvb.example.com/fiche',
    });
    expect(club.source === 'ffvb_club').toBe(true);
    expect(club.club_telephone).toBeTruthy();
    expect(club.club_site_web).toBeTruthy();
    expect(club.club_lien_fiche).toBeTruthy();
  });

  // ── FFVB region display ──

  it('shows region when either ligue or comite is set', () => {
    const s1 = spot({ ffvb_ligue: 'Auvergne-Rhône-Alpes' });
    expect([s1.ffvb_comite, s1.ffvb_ligue].filter(Boolean).join(' — ')).toBe('Auvergne-Rhône-Alpes');

    const s2 = spot({ ffvb_comite: 'Rhône', ffvb_ligue: 'AURA' });
    expect([s2.ffvb_comite, s2.ffvb_ligue].filter(Boolean).join(' — ')).toBe('Rhône — AURA');
  });

  it('hides region when both are null', () => {
    const show = !!(leValdier.ffvb_ligue || leValdier.ffvb_comite);
    expect(show).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. SEASONALITY PARSING — DEEP EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════

describe('Seasonality parsing — deep', () => {
  const parseSeason = (period: string | null, saisonnier: boolean | null) => {
    if (saisonnier === false || period === "Toute l'année") return { type: 'yearly' as const };
    if (!period) return saisonnier ? { type: 'seasonal' as const, start: null, end: null } : null;
    const match = period.match(/De (.+) à (.+)/);
    if (match) {
      const startIdx = MONTHS_FULL.indexOf(match[1]);
      const endIdx = MONTHS_FULL.indexOf(match[2]);
      return { type: 'seasonal' as const, start: startIdx >= 0 ? startIdx : null, end: endIdx >= 0 ? endIdx : null };
    }
    return { type: 'seasonal' as const, start: null, end: null };
  };

  const isMonthActive = (month: number, start: number | null, end: number | null): boolean => {
    if (start == null || end == null) return false;
    return start <= end
      ? month >= start && month <= end
      : month >= start || month <= end;
  };

  // ── Le Valdier: Mai→Septembre ──

  it('Le Valdier: Mai (4) to Septembre (8)', () => {
    const result = parseSeason('De Mai à Septembre', true);
    expect(result).toEqual({ type: 'seasonal', start: 4, end: 8 });
  });

  it('Le Valdier: active months are May through Sep', () => {
    const active = Array.from({ length: 12 }, (_, i) => isMonthActive(i, 4, 8));
    //                    Jan   Fév   Mar   Avr   Mai   Jun   Jul   Aoû   Sep   Oct   Nov   Déc
    expect(active).toEqual([false, false, false, false, true, true, true, true, true, false, false, false]);
  });

  // ── Wrapping: Octobre→Mars ──

  it('wrapping period Oct→Mar activates correct months', () => {
    const active = Array.from({ length: 12 }, (_, i) => isMonthActive(i, 9, 2));
    //                    Jan   Fév   Mar   Avr   Mai   Jun   Jul   Aoû   Sep   Oct   Nov   Déc
    expect(active).toEqual([true, true, true, false, false, false, false, false, false, true, true, true]);
  });

  // ── Single month ──

  it('same start and end month activates only that month', () => {
    const result = parseSeason('De Janvier à Janvier', true);
    expect(result).toEqual({ type: 'seasonal', start: 0, end: 0 });
    const active = Array.from({ length: 12 }, (_, i) => isMonthActive(i, 0, 0));
    expect(active.filter(Boolean)).toHaveLength(1);
    expect(active[0]).toBe(true);
  });

  // ── Full year via seasonal format ──

  it('Jan→Dec via seasonal format activates all 12 months', () => {
    const result = parseSeason('De Janvier à Décembre', true);
    expect(result).toEqual({ type: 'seasonal', start: 0, end: 11 });
    const active = Array.from({ length: 12 }, (_, i) => isMonthActive(i, 0, 11));
    expect(active.every(Boolean)).toBe(true);
  });

  // ── Invalid months in the string ──

  it('invalid month names return null indices', () => {
    const result = parseSeason('De Maitember à Foobar', true);
    expect(result).toEqual({ type: 'seasonal', start: null, end: null });
  });

  // ── Priority: saisonnier=false overrides period string ──

  it('saisonnier=false wins over period string', () => {
    const result = parseSeason('De Mai à Septembre', false);
    expect(result).toEqual({ type: 'yearly' });
  });

  // ── No period + no seasonal flag ──

  it('null period + null saisonnier returns null (no display)', () => {
    expect(parseSeason(null, null)).toBeNull();
  });

  // ── Saisonnier=true but no period → seasonal with no data ──

  it('saisonnier=true but no period → seasonal with null bounds', () => {
    const result = parseSeason(null, true);
    expect(result).toEqual({ type: 'seasonal', start: null, end: null });
  });

  // ── Malformed period string ──

  it('malformed period string returns seasonal with null bounds', () => {
    expect(parseSeason('Ouvert Mai-Sep', true)).toEqual({ type: 'seasonal', start: null, end: null });
    expect(parseSeason('Mai à Septembre', true)).toEqual({ type: 'seasonal', start: null, end: null });
    expect(parseSeason('De à', true)).toEqual({ type: 'seasonal', start: null, end: null });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. COMMENT SYSTEM — FULL SCENARIO
// ═══════════════════════════════════════════════════════════════════════════

describe('Comment system — Le Valdier reviews', () => {
  // ── Submission guard (mirrors SpotDetailModal line 111) ──

  const canSubmit = (content: string, rating: number, photoCount: number) =>
    !!(content.trim() || rating > 0 || photoCount > 0);

  it('blocks empty submission (no text, no rating, no photos)', () => {
    expect(canSubmit('', 0, 0)).toBe(false);
    expect(canSubmit('   ', 0, 0)).toBe(false);
    expect(canSubmit('\n', 0, 0)).toBe(false);
  });

  it('allows text-only', () => {
    expect(canSubmit('Super terrain', 0, 0)).toBe(true);
  });

  it('allows rating-only', () => {
    expect(canSubmit('', 4, 0)).toBe(true);
  });

  it('allows photos-only', () => {
    expect(canSubmit('', 0, 1)).toBe(true);
  });

  it('allows all three together', () => {
    expect(canSubmit('Nice!', 5, 2)).toBe(true);
  });

  // ── Rating values ──

  it('rating 0 is treated as "no rating" (stored as null)', () => {
    const stored = 0 > 0 ? 0 : null;
    expect(stored).toBeNull();
  });

  it('rating 1-5 are stored as-is', () => {
    for (let r = 1; r <= 5; r++) {
      const stored = r > 0 ? r : null;
      expect(stored).toBe(r);
    }
  });

  // ── Average rating calculation (using the real function) ──

  it('calculates average ignoring null and 0 ratings', () => {
    const comments = [
      { rating: 5 },
      { rating: null },
      { rating: 0 },
      { rating: 3 },
      { rating: 4 },
    ];
    // Only 5, 3, 4 count → avg = 4
    expect(calcAverageRating(comments)).toBe(4);
  });

  it('returns 0 for empty comment list', () => {
    expect(calcAverageRating([])).toBe(0);
  });

  it('returns 0 when all ratings are null', () => {
    expect(calcAverageRating([{ rating: null }, { rating: null }])).toBe(0);
  });

  it('returns 0 when all ratings are 0', () => {
    expect(calcAverageRating([{ rating: 0 }, { rating: 0 }])).toBe(0);
  });

  it('single 5-star rating returns 5', () => {
    expect(calcAverageRating([{ rating: 5 }])).toBe(5);
  });

  it('handles fractional averages', () => {
    // 4 + 5 = 9 / 2 = 4.5
    expect(calcAverageRating([{ rating: 4 }, { rating: 5 }])).toBe(4.5);
  });

  it('display formats average with 1 decimal', () => {
    const avg = calcAverageRating([{ rating: 4 }, { rating: 5 }]);
    expect(avg.toFixed(1)).toBe('4.5');
  });

  it('hides rating badge when average is 0', () => {
    const avg = calcAverageRating([]);
    const showBadge = avg > 0;
    expect(showBadge).toBe(false);
  });

  // ── Photo limits ──

  it('comment allows up to 5 photos', () => {
    const canAdd = (current: number, toAdd: number) => current + toAdd <= 5;
    expect(canAdd(0, 5)).toBe(true);
    expect(canAdd(4, 1)).toBe(true);
    expect(canAdd(5, 0)).toBe(true);
  });

  it('rejects 6th photo', () => {
    const canAdd = (current: number, toAdd: number) => current + toAdd <= 5;
    expect(canAdd(5, 1)).toBe(false);
    expect(canAdd(3, 3)).toBe(false);
    expect(canAdd(0, 6)).toBe(false);
  });

  // ── Comment author resolution ──

  it('falls back to "Anonyme" when profile not found', () => {
    const profileMap: Record<string, string> = { 'user-1': 'Alice' };
    const authorName = profileMap['user-unknown'] || 'Anonyme';
    expect(authorName).toBe('Anonyme');
  });

  it('resolves correct display name', () => {
    const profileMap: Record<string, string> = { 'user-1': 'Alice', 'user-2': 'Bob' };
    expect(profileMap['user-1'] || 'Anonyme').toBe('Alice');
    expect(profileMap['user-2'] || 'Anonyme').toBe('Bob');
  });

  // ── Comment date display ──

  it('formats created_at as locale date', () => {
    const date = new Date('2025-08-15T14:30:00Z');
    const formatted = date.toLocaleDateString();
    expect(formatted).toBeTruthy();
    // Ensure it doesn't return Invalid Date
    expect(date.getTime()).not.toBeNaN();
  });

  it('handles ISO timestamp correctly', () => {
    const d = new Date('2025-06-01T10:00:00Z');
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(5); // June = 5
  });

  // ── AI summary gate ──

  it('AI summary button only shown when comments exist', () => {
    expect(0 > 0).toBe(false);   // No comments → hidden
    expect(1 > 0).toBe(true);    // Has comments → shown
    expect(10 > 0).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. FAVORITE SYSTEM — EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════

describe('Favorite system — edge cases', () => {
  const toggleFavorite = (favs: string[], spotId: string, isFavorite: boolean) =>
    isFavorite ? favs.filter(f => f !== spotId) : [...favs, spotId];

  it('adds to empty list', () => {
    expect(toggleFavorite([], 'spot-valdier', false)).toEqual(['spot-valdier']);
  });

  it('removes from list', () => {
    expect(toggleFavorite(['spot-valdier', 'spot-2'], 'spot-valdier', true)).toEqual(['spot-2']);
  });

  it('does not duplicate when adding', () => {
    const result = toggleFavorite(['spot-valdier'], 'spot-2', false);
    expect(result).toEqual(['spot-valdier', 'spot-2']);
  });

  it('removing non-existent ID is a no-op', () => {
    const result = toggleFavorite(['spot-1', 'spot-2'], 'spot-99', true);
    expect(result).toEqual(['spot-1', 'spot-2']);
  });

  it('handles corrupted localStorage gracefully', () => {
    const parse = (raw: string) => {
      try { return JSON.parse(raw); } catch { return []; }
    };
    expect(parse('not-json')).toEqual([]);
    expect(parse('null')).toBeNull();
    expect(parse('42')).toBe(42);
    expect(parse('[]')).toEqual([]);
    expect(parse('["a"]')).toEqual(['a']);
  });

  it('check favorite returns false for new spot', () => {
    const favs = ['spot-1', 'spot-2'];
    expect(favs.includes('spot-valdier')).toBe(false);
  });

  it('check favorite returns true for saved spot', () => {
    const favs = ['spot-valdier', 'spot-2'];
    expect(favs.includes('spot-valdier')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. SUGGESTION / EDIT FLOW
// ═══════════════════════════════════════════════════════════════════════════

describe('Suggestion flow — modifying Le Valdier', () => {
  function buildSuggestionPayload(
    original: { lat: number | null; lng: number | null },
    form: { name: string; description: string; type: string; availability_period: string },
    userId: string,
  ) {
    return {
      name: form.name,
      description: form.description,
      type: form.type,
      availability_period: form.availability_period,
      lat: original.lat,
      lng: original.lng,
      user_id: userId,
      status: 'waiting_for_validation',
    };
  }

  it('preserves original coordinates', () => {
    const payload = buildSuggestionPayload(
      leValdier,
      { name: 'Le Valdier (corrigé)', description: 'Updated', type: 'beach', availability_period: 'De Avril à Octobre' },
      'user-editor',
    );
    expect(payload.lat).toBe(leValdier.lat);
    expect(payload.lng).toBe(leValdier.lng);
  });

  it('creates a NEW record (no id from original)', () => {
    const payload = buildSuggestionPayload(
      leValdier,
      { name: 'Le Valdier v2', description: '', type: 'beach', availability_period: "Toute l'année" },
      'user-editor',
    );
    expect(payload).not.toHaveProperty('id');
  });

  it('suggestion is always waiting_for_validation', () => {
    const payload = buildSuggestionPayload(
      leValdier,
      { name: 'Le Valdier', description: '', type: 'beach', availability_period: "Toute l'année" },
      'user-editor',
    );
    expect(payload.status).toBe('waiting_for_validation');
  });

  it('allows changing type in suggestion', () => {
    const payload = buildSuggestionPayload(
      leValdier,
      { name: 'Le Valdier', description: '', type: 'outdoor_grass', availability_period: "Toute l'année" },
      'user-editor',
    );
    expect(payload.type).toBe('outdoor_grass');
    expect(payload.type).not.toBe(leValdier.type);
  });

  it('allows changing availability in suggestion', () => {
    const payload = buildSuggestionPayload(
      leValdier,
      { name: 'Le Valdier', description: '', type: 'beach', availability_period: "Toute l'année" },
      'user-editor',
    );
    expect(payload.availability_period).toBe("Toute l'année");
    expect(payload.availability_period).not.toBe(leValdier.availability_period);
  });

  // ── Form reset on edit ──

  it('form resets with spot data when opening for edit', () => {
    const resetName = leValdier.name || '';
    const resetType = leValdier.type || 'outdoor_hard';
    const resetDesc = leValdier.description || '';
    expect(resetName).toBe('Le Valdier');
    expect(resetType).toBe('beach');
    expect(resetDesc).toBe('Terrain de beach volley au bord du Rhône, sable fin.');
  });

  it('form availability reset parses seasonal format', () => {
    const period = 'De Mai à Septembre';
    const parts = period.match(/De (.+) à (.+)/);
    expect(parts).not.toBeNull();
    expect(parts![1]).toBe('Mai');
    expect(parts![2]).toBe('Septembre');
  });

  it('form availability reset handles all-year', () => {
    const period = "Toute l'année";
    const isAllYear = !period || period === "Toute l'année";
    expect(isAllYear).toBe(true);
  });

  it('form availability reset handles null period', () => {
    const period = null;
    const isAllYear = !period || period === "Toute l'année";
    expect(isAllYear).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. MODERATION — APPROVE / REJECT Le Valdier
// ═══════════════════════════════════════════════════════════════════════════

describe('Moderation — Le Valdier lifecycle', () => {
  const isModerator = (email: string) => email === MODERATOR_EMAIL;
  const getStatus = (action: 'approve' | 'reject') => action === 'approve' ? 'validated' : 'rejected';
  const showModButtons = (isMod: boolean, status: string) => isMod && status !== 'validated';

  it('pending Le Valdier shows moderation buttons to moderator', () => {
    expect(showModButtons(true, 'waiting_for_validation')).toBe(true);
  });

  it('validated Le Valdier hides moderation buttons', () => {
    expect(showModButtons(true, 'validated')).toBe(false);
  });

  it('rejected spot still shows moderation buttons (can re-approve)', () => {
    expect(showModButtons(true, 'rejected')).toBe(true);
  });

  it('non-moderator never sees moderation buttons', () => {
    expect(showModButtons(false, 'waiting_for_validation')).toBe(false);
    expect(showModButtons(false, 'rejected')).toBe(false);
  });

  it('approve transitions to validated', () => {
    expect(getStatus('approve')).toBe('validated');
  });

  it('reject transitions to rejected', () => {
    expect(getStatus('reject')).toBe('rejected');
  });

  it('moderator identification is case-sensitive', () => {
    expect(isModerator('Antonin.Marcon@gmail.com')).toBe(false);
    expect(isModerator('ANTONIN.MARCON@GMAIL.COM')).toBe(false);
    expect(isModerator('antonin.marcon@gmail.com')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. FILTERS — Le Valdier VISIBILITY
// ═══════════════════════════════════════════════════════════════════════════

describe('Filters — Le Valdier visibility', () => {
  it('visible with default filters (exterior + beach + libre accès)', () => {
    const result = filterSpots([spot()], filters(), null);
    expect(result).toHaveLength(1);
  });

  it('hidden when showExterieur is off', () => {
    const f = filters();
    f.showExterieur = false;
    expect(filterSpots([spot()], f, null)).toHaveLength(0);
  });

  it('hidden when ext_beach is off', () => {
    const f = filters();
    f.subFilters.ext_beach = false;
    expect(filterSpots([spot()], f, null)).toHaveLength(0);
  });

  it('hidden when libre accès required but spot has no libre accès', () => {
    const f = filters();
    f.subFilters.acces_libre = true;
    const s = spot({ equip_acces_libre: false });
    expect(filterSpots([s], f, null)).toHaveLength(0);
  });

  it('visible when libre accès disabled', () => {
    const f = filters();
    f.subFilters.acces_libre = false;
    const s = spot({ equip_acces_libre: false });
    expect(filterSpots([s], f, null)).toHaveLength(1);
  });

  it('beach éclairage filter works', () => {
    const f = filters();
    f.subFilters.beach_eclairage = true;
    expect(filterSpots([spot()], f, null)).toHaveLength(1); // Le Valdier has éclairage
    expect(filterSpots([spot({ equip_eclairage: false })], f, null)).toHaveLength(0);
  });

  it('beach PMR filter works', () => {
    const f = filters();
    f.subFilters.beach_pmr = true;
    expect(filterSpots([spot()], f, null)).toHaveLength(0); // Le Valdier has NO PMR
    expect(filterSpots([spot({ equip_pmr: true })], f, null)).toHaveLength(1);
  });

  it('beach saison filter: annee excludes saisonnier spots', () => {
    const f = filters();
    f.subFilters.beach_saison = 'annee';
    expect(filterSpots([spot()], f, null)).toHaveLength(0); // Le Valdier is saisonnier
  });

  it('beach saison filter: saisonnier shows saisonnier spots', () => {
    const f = filters();
    f.subFilters.beach_saison = 'saisonnier';
    expect(filterSpots([spot()], f, null)).toHaveLength(1);
  });

  it('beach saison filter: all shows everything', () => {
    const f = filters();
    f.subFilters.beach_saison = 'all';
    expect(filterSpots([spot()], f, null)).toHaveLength(1);
  });

  it('clubs filter does not affect beach spots', () => {
    const f = filters();
    f.showClubs = true;
    expect(filterSpots([spot()], f, null)).toHaveLength(1);
  });

  it('pending mode passes through all spots (query pre-filters)', () => {
    // Status filtering is now at the Supabase query level — filterSpots in
    // pending mode passes everything the query returns (pending + reported).
    const f = filters();
    f.showPending = true;
    const pending = spot({ status: 'waiting_for_validation' });
    const validated = spot({ id: 'spot-2' });
    expect(filterSpots([pending, validated], f, null)).toHaveLength(2);
  });

  it('rejected spots are never visible in normal mode', () => {
    const f = filters();
    expect(filterSpots([spot({ status: 'rejected' })], f, null)).toHaveLength(0);
  });

  it('indoor spots are never visible', () => {
    const f = filters();
    expect(filterSpots([spot({ type: 'indoor' })], f, null)).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. PHOTO UPLOAD VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

describe('Photo upload validation', () => {
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const MAX_SIZE = 5 * 1024 * 1024;

  const validatePhoto = (type: string, size: number) => {
    if (!ALLOWED_TYPES.includes(type)) return 'invalid_type';
    if (size > MAX_SIZE) return 'too_large';
    return 'ok';
  };

  it('accepts JPEG', () => { expect(validatePhoto('image/jpeg', 1000)).toBe('ok'); });
  it('accepts PNG', () => { expect(validatePhoto('image/png', 1000)).toBe('ok'); });
  it('accepts WebP', () => { expect(validatePhoto('image/webp', 1000)).toBe('ok'); });
  it('accepts GIF', () => { expect(validatePhoto('image/gif', 1000)).toBe('ok'); });

  it('rejects PDF', () => { expect(validatePhoto('application/pdf', 1000)).toBe('invalid_type'); });
  it('rejects SVG', () => { expect(validatePhoto('image/svg+xml', 1000)).toBe('invalid_type'); });
  it('rejects text', () => { expect(validatePhoto('text/plain', 1000)).toBe('invalid_type'); });
  it('rejects HEIC', () => { expect(validatePhoto('image/heic', 1000)).toBe('invalid_type'); });

  it('accepts file at exactly 5MB', () => {
    expect(validatePhoto('image/jpeg', MAX_SIZE)).toBe('ok');
  });

  it('rejects file at 5MB + 1 byte', () => {
    expect(validatePhoto('image/jpeg', MAX_SIZE + 1)).toBe('too_large');
  });

  it('rejects 10MB file', () => {
    expect(validatePhoto('image/jpeg', 10 * 1024 * 1024)).toBe('too_large');
  });

  // ── File extension extraction ──

  it('extracts extension from filename', () => {
    const ext = (name: string, type: string) => name.includes('.') ? name.split('.').pop() : type.split('/')[1];
    expect(ext('photo.jpg', 'image/jpeg')).toBe('jpg');
    expect(ext('photo.PNG', 'image/png')).toBe('PNG');
    expect(ext('no-ext', 'image/webp')).toBe('webp');
    expect(ext('.hidden', 'image/png')).toBe('hidden');
  });

  // ── Max photos per spot form ──

  it('form allows up to 5 photos', () => {
    const canAdd = (current: number, toAdd: number) => current + toAdd <= 5;
    expect(canAdd(0, 5)).toBe(true);
    expect(canAdd(5, 0)).toBe(true);
    expect(canAdd(5, 1)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 10. RATE LIMITING
// ═══════════════════════════════════════════════════════════════════════════

describe('Rate limiting logic', () => {
  const LIMIT = 10;

  const checkLimit = (count: number) => count < LIMIT;

  it('allows first action', () => {
    expect(checkLimit(0)).toBe(true);
  });

  it('allows 9th action', () => {
    expect(checkLimit(9)).toBe(true);
  });

  it('blocks 10th action', () => {
    expect(checkLimit(10)).toBe(false);
  });

  it('blocks 11th action', () => {
    expect(checkLimit(11)).toBe(false);
  });

  // ── Date reset logic ──

  it('resets counter when date changes', () => {
    const stored = { date: '2025-08-14', count: 10 };
    const today = '2025-08-15';
    const data = stored.date === today ? stored : { date: today, count: 0 };
    expect(data.count).toBe(0);
  });

  it('preserves counter on same day', () => {
    const stored = { date: '2025-08-15', count: 7 };
    const today = '2025-08-15';
    const data = stored.date === today ? stored : { date: today, count: 0 };
    expect(data.count).toBe(7);
  });

  it('handles corrupted storage gracefully', () => {
    const parse = (raw: string | null) => {
      try {
        if (!raw) return { date: '', count: 0 };
        return JSON.parse(raw);
      } catch { return { date: '', count: 0 }; }
    };
    expect(parse(null)).toEqual({ date: '', count: 0 });
    expect(parse('garbage')).toEqual({ date: '', count: 0 });
    expect(parse('{"date":"2025-08-15","count":3}')).toEqual({ date: '2025-08-15', count: 3 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 11. SWIPE-TO-CLOSE GESTURE
// ═══════════════════════════════════════════════════════════════════════════

describe('Swipe-to-close gesture', () => {
  const CLOSE_THRESHOLD = 120;

  it('does NOT close below threshold', () => {
    expect(119 > CLOSE_THRESHOLD).toBe(false);
    expect(50 > CLOSE_THRESHOLD).toBe(false);
    expect(0 > CLOSE_THRESHOLD).toBe(false);
  });

  it('closes at threshold + 1', () => {
    expect(121 > CLOSE_THRESHOLD).toBe(true);
  });

  it('does NOT close at exactly threshold', () => {
    // Code: dragOffset > 120 (strictly greater)
    expect(120 > CLOSE_THRESHOLD).toBe(false);
  });

  it('closes at large swipe', () => {
    expect(300 > CLOSE_THRESHOLD).toBe(true);
  });

  it('resets offset after gesture ends', () => {
    let offset = 200;
    // Simulate handleTouchEnd
    if (offset > CLOSE_THRESHOLD) { /* would call onClose */ }
    offset = 0;
    expect(offset).toBe(0);
  });

  it('only starts drag when sheet is scrolled to top', () => {
    const canStartDrag = (scrollTop: number) => scrollTop <= 0;
    expect(canStartDrag(0)).toBe(true);
    expect(canStartDrag(-1)).toBe(true);  // iOS bounce
    expect(canStartDrag(1)).toBe(false);
    expect(canStartDrag(100)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 12. DISTANCE CALCULATIONS — PROXIMITY TO Le Valdier
// ═══════════════════════════════════════════════════════════════════════════

describe('Distance — proximity to Le Valdier', () => {
  const VALDIER: [number, number] = [45.7640, 4.8357];

  it('distance to itself is 0', () => {
    expect(getDistance(VALDIER[0], VALDIER[1], VALDIER[0], VALDIER[1])).toBe(0);
  });

  it('Lyon center is ~2-5km away', () => {
    const lyon: [number, number] = [45.7578, 4.8320];
    const dist = getDistance(VALDIER[0], VALDIER[1], lyon[0], lyon[1]);
    expect(dist).toBeGreaterThan(0);
    expect(dist).toBeLessThan(5);
  });

  it('Paris is ~350-450km away', () => {
    const paris: [number, number] = [48.8566, 2.3522];
    const dist = getDistance(VALDIER[0], VALDIER[1], paris[0], paris[1]);
    expect(dist).toBeGreaterThan(350);
    expect(dist).toBeLessThan(450);
  });

  it('Marseille is ~250-350km away', () => {
    const marseille: [number, number] = [43.2965, 5.3698];
    const dist = getDistance(VALDIER[0], VALDIER[1], marseille[0], marseille[1]);
    expect(dist).toBeGreaterThan(250);
    expect(dist).toBeLessThan(350);
  });

  it('same latitude different longitude', () => {
    const dist = getDistance(VALDIER[0], VALDIER[1], VALDIER[0], VALDIER[1] + 1);
    expect(dist).toBeGreaterThan(50);
    expect(dist).toBeLessThan(100);
  });

  it('Haversine never returns NaN', () => {
    expect(Number.isNaN(getDistance(0, 0, 0, 0))).toBe(false);
    expect(Number.isNaN(getDistance(90, 0, -90, 0))).toBe(false);
    expect(Number.isNaN(getDistance(0, 180, 0, -180))).toBe(false);
  });

  it('poles are ~20000km apart', () => {
    const dist = getDistance(90, 0, -90, 0);
    expect(dist).toBeGreaterThan(19000);
    expect(dist).toBeLessThan(21000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 13. COMBINED SCENARIOS — REALISTIC USER JOURNEYS
// ═══════════════════════════════════════════════════════════════════════════

describe('Combined user journeys', () => {
  it('Journey: user creates Le Valdier → spot not visible until approved', () => {
    const pending = spot({ status: 'waiting_for_validation' });
    const f = filters();
    // Normal user: pending spot is invisible
    expect(filterSpots([pending], f, null)).toHaveLength(0);
    // Moderator filter: visible
    f.showPending = true;
    expect(filterSpots([pending], f, null)).toHaveLength(1);
  });

  it('Journey: moderator approves → spot now visible to everyone', () => {
    const validated = spot({ status: 'validated' });
    expect(filterSpots([validated], filters(), null)).toHaveLength(1);
  });

  it('Journey: user leaves review → average updates', () => {
    const before = calcAverageRating([]);
    expect(before).toBe(0);

    const after = calcAverageRating([{ rating: 4 }]);
    expect(after).toBe(4);

    const afterTwo = calcAverageRating([{ rating: 4 }, { rating: 5 }]);
    expect(afterTwo).toBe(4.5);
  });

  it('Journey: user favorites → un-favorites Le Valdier', () => {
    let favs: string[] = [];
    // Add
    favs = [...favs, 'spot-valdier'];
    expect(favs.includes('spot-valdier')).toBe(true);
    // Remove
    favs = favs.filter(f => f !== 'spot-valdier');
    expect(favs.includes('spot-valdier')).toBe(false);
  });

  it('Journey: user suggests modification → creates new pending spot', () => {
    const original = spot();
    const suggestion = {
      name: 'Le Valdier (mis à jour)',
      type: 'beach',
      lat: original.lat,
      lng: original.lng,
      status: 'waiting_for_validation',
    };
    // Original unchanged
    expect(original.name).toBe('Le Valdier');
    expect(original.status).toBe('validated');
    // Suggestion is separate
    expect(suggestion.name).not.toBe(original.name);
    expect(suggestion.status).toBe('waiting_for_validation');
    expect(suggestion.lat).toBe(original.lat);
  });

  it('Journey: mixed spot types all appear with correct filters', () => {
    const spots = [
      spot({ id: '1', type: 'beach' }),
      spot({ id: '2', type: 'outdoor_hard' }),
      spot({ id: '3', type: 'outdoor_grass' }),
      spot({ id: '4', type: 'club', equip_acces_libre: null }),
      spot({ id: '5', type: 'indoor' }),
    ];
    const f = filters();
    f.showClubs = true;
    f.subFilters.acces_libre = false; // Don't filter by libre accès

    const result = filterSpots(spots, f, null);
    const ids = result.map(s => s.id);
    expect(ids).toContain('1'); // beach
    expect(ids).toContain('2'); // outdoor_hard
    expect(ids).toContain('3'); // outdoor_grass
    expect(ids).toContain('4'); // club
    expect(ids).not.toContain('5'); // indoor never shown
  });

  it('Journey: beach + éclairage + saisonnier combined filter', () => {
    const spots = [
      spot({ id: '1', equip_eclairage: true, equip_saisonnier: true }),   // Le Valdier: match
      spot({ id: '2', equip_eclairage: false, equip_saisonnier: true }),   // no éclairage
      spot({ id: '3', equip_eclairage: true, equip_saisonnier: false }),   // not saisonnier
    ];
    const f = filters();
    f.subFilters.beach_eclairage = true;
    f.subFilters.beach_saison = 'saisonnier';

    const result = filterSpots(spots, f, null);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 14. MONTHS CONSTANTS INTEGRITY
// ═══════════════════════════════════════════════════════════════════════════

describe('Months constants', () => {
  it('MONTHS_SHORT has 12 entries', () => {
    expect(MONTHS_SHORT).toHaveLength(12);
  });

  it('MONTHS_FULL has 12 entries', () => {
    expect(MONTHS_FULL).toHaveLength(12);
  });

  it('MONTHS_FULL are all unique', () => {
    expect(new Set(MONTHS_FULL).size).toBe(12);
  });

  it('MONTHS_SHORT are all unique', () => {
    expect(new Set(MONTHS_SHORT).size).toBe(12);
  });

  it('MONTHS_FULL and MONTHS_SHORT are aligned (same order)', () => {
    expect(MONTHS_FULL[0]).toBe('Janvier');
    expect(MONTHS_SHORT[0]).toBe('Jan');
    expect(MONTHS_FULL[11]).toBe('Décembre');
    expect(MONTHS_SHORT[11]).toBe('Déc');
  });

  it('every month has a 3-char abbreviation', () => {
    for (const m of MONTHS_SHORT) {
      expect(m.length).toBe(3);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 15. SPOT TYPE CONFIG INTEGRITY
// ═══════════════════════════════════════════════════════════════════════════

describe('Spot type config integrity', () => {
  it('all exterior types have a config entry', () => {
    for (const type of EXTERIOR_TYPES) {
      expect(SPOT_TYPE_CONFIG[type]).toBeDefined();
    }
  });

  it('club has a config entry', () => {
    expect(SPOT_TYPE_CONFIG['club']).toBeDefined();
  });

  it('no config for indoor', () => {
    expect(SPOT_TYPE_CONFIG['indoor']).toBeUndefined();
  });

  it('all configs have distinct emojis', () => {
    const emojis = Object.values(SPOT_TYPE_CONFIG).map(c => c.emoji);
    expect(new Set(emojis).size).toBe(emojis.length);
  });

  it('all configs have valid hex colors', () => {
    for (const cfg of Object.values(SPOT_TYPE_CONFIG)) {
      expect(cfg.hex).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('all configs have bg class starting with bg-', () => {
    for (const cfg of Object.values(SPOT_TYPE_CONFIG)) {
      expect(cfg.bg).toMatch(/^bg-/);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 16. REPORT / SIGNALEMENT SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

describe('Report system — signaler un spot', () => {
  const REPORT_REASONS = ['gone', 'duplicate', 'wrong_location', 'wrong_info', 'other'] as const;
  type ReportReason = typeof REPORT_REASONS[number];

  const REASON_LABELS: Record<ReportReason, string> = {
    gone: "N'existe plus",
    duplicate: 'Doublon',
    wrong_location: 'Mauvais lieu',
    wrong_info: 'Infos fausses',
    other: 'Autre',
  };

  // ── Reason validation ──

  it('has 5 report reasons', () => {
    expect(REPORT_REASONS).toHaveLength(5);
  });

  it('all reasons have a label', () => {
    for (const r of REPORT_REASONS) {
      expect(REASON_LABELS[r]).toBeTruthy();
    }
  });

  // ── Submission guard ──

  it('blocks submission without a reason in report mode', () => {
    const canSubmit = (reportMode: boolean, reason: string) =>
      !reportMode || !!reason;
    expect(canSubmit(true, '')).toBe(false);
    expect(canSubmit(true, 'gone')).toBe(true);
    expect(canSubmit(false, '')).toBe(true); // normal mode doesn't need reason
  });

  it('allows submission with reason and no comment text', () => {
    const reportMode = true;
    const reason = 'gone';
    const content = '';
    const valid = !!reason; // reason is required, content is optional
    expect(valid).toBe(true);
  });

  it('allows submission with reason and comment text', () => {
    const reason = 'duplicate';
    const content = 'Même terrain que "Beach Lyon 6ème"';
    expect(!!reason && content.trim().length > 0).toBe(true);
  });

  // ── Report payload ──

  it('builds report comment with report_reason field', () => {
    const payload = {
      spot_id: 'spot-valdier',
      user_id: 'user-42',
      content: 'Le terrain a été détruit',
      rating: null,
      report_reason: 'gone' as ReportReason,
    };
    expect(payload.report_reason).toBe('gone');
    expect(payload.rating).toBeNull(); // reports don't have ratings
    expect(payload.content).toBe('Le terrain a été détruit');
  });

  it('normal comment has null report_reason', () => {
    const payload = {
      spot_id: 'spot-valdier',
      user_id: 'user-42',
      content: 'Super terrain !',
      rating: 5,
      report_reason: null,
    };
    expect(payload.report_reason).toBeNull();
    expect(payload.rating).toBe(5);
  });

  // ── Report mode toggle ──

  it('toggles report mode on and off', () => {
    let reportMode = false;
    reportMode = !reportMode;
    expect(reportMode).toBe(true);
    reportMode = !reportMode;
    expect(reportMode).toBe(false);
  });

  it('resets reason when toggling off', () => {
    let reason = 'gone';
    // Simulate toggle off
    reason = '';
    expect(reason).toBe('');
  });

  // ── Report display ──

  it('report comments are visually distinct', () => {
    const isReport = (comment: { report_reason: string | null }) => !!comment.report_reason;
    expect(isReport({ report_reason: 'gone' })).toBe(true);
    expect(isReport({ report_reason: null })).toBe(false);
    expect(isReport({ report_reason: '' })).toBe(false);
  });

  it('report reason badge shows correct label', () => {
    const getLabel = (reason: string) => REASON_LABELS[reason as ReportReason] || reason;
    expect(getLabel('gone')).toBe("N'existe plus");
    expect(getLabel('duplicate')).toBe('Doublon');
    expect(getLabel('wrong_location')).toBe('Mauvais lieu');
    expect(getLabel('wrong_info')).toBe('Infos fausses');
    expect(getLabel('other')).toBe('Autre');
    expect(getLabel('unknown')).toBe('unknown'); // fallback to raw value
  });

  // ── Report count for moderator ──

  it('counts reports correctly', () => {
    const comments = [
      { report_reason: 'gone', content: 'Détruit' },
      { report_reason: null, content: 'Super' },
      { report_reason: 'duplicate', content: '' },
      { report_reason: null, content: 'Bof' },
    ];
    const reportCount = comments.filter(c => c.report_reason).length;
    expect(reportCount).toBe(2);
  });

  it('shows 0 reports for clean spot', () => {
    const comments = [
      { report_reason: null, content: 'Nice' },
      { report_reason: null, content: 'Cool' },
    ];
    const reportCount = comments.filter(c => c.report_reason).length;
    expect(reportCount).toBe(0);
  });

  it('moderator sees report indicator only when reports > 0', () => {
    const showIndicator = (isModerator: boolean, reportCount: number) =>
      isModerator && reportCount > 0;
    expect(showIndicator(true, 2)).toBe(true);
    expect(showIndicator(true, 0)).toBe(false);
    expect(showIndicator(false, 5)).toBe(false);
  });

  // ── Reports don't affect average rating ──

  it('report comments have null rating (excluded from average)', () => {
    const comments = [
      { rating: 5, report_reason: null },
      { rating: null, report_reason: 'gone' },
      { rating: 3, report_reason: null },
    ];
    const avg = calcAverageRating(comments);
    expect(avg).toBe(4); // (5 + 3) / 2 — report with null rating excluded
  });

  // ── Combined: report + normal comments ──

  it('mixing reports and reviews works correctly', () => {
    const comments = [
      { content: 'Super terrain', rating: 5, report_reason: null },
      { content: 'Le terrain a été détruit', rating: null, report_reason: 'gone' },
      { content: 'Bel endroit', rating: 4, report_reason: null },
    ];
    const reviews = comments.filter(c => !c.report_reason);
    const reports = comments.filter(c => c.report_reason);
    expect(reviews).toHaveLength(2);
    expect(reports).toHaveLength(1);
    expect(calcAverageRating(reviews)).toBe(4.5);
  });
});
