import { describe, it, expect } from 'vitest';
import { filterSpots } from '@/lib/filterSpots';
import { DEFAULT_FILTERS, type SpotFiltersState } from '@/components/spots/SpotFilters';

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
};

const filters = (): SpotFiltersState => JSON.parse(JSON.stringify(DEFAULT_FILTERS));

// ---------------------------------------------------------------------------
// 1. All filters OFF shows nothing
// ---------------------------------------------------------------------------
describe('filterEdgeCases — all filters OFF', () => {
  it('shows nothing when both showExterieur and showClubs are false', () => {
    const f = filters();
    f.showExterieur = false;
    f.showClubs = false;
    const spots = [
      { ...baseSpot, id: '1', type: 'outdoor_hard' },
      { ...baseSpot, id: '2', type: 'beach' },
      { ...baseSpot, id: '3', type: 'club' },
      { ...baseSpot, id: '4', type: 'green_volley' },
    ];
    expect(filterSpots(spots, f, null)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Only clubs ON
// ---------------------------------------------------------------------------
describe('filterEdgeCases — only clubs ON', () => {
  it('shows only club type when showClubs=true and showExterieur=false', () => {
    const f = filters();
    f.showExterieur = false;
    f.showClubs = true;
    const spots = [
      { ...baseSpot, id: '1', type: 'outdoor_hard' },
      { ...baseSpot, id: '2', type: 'club' },
      { ...baseSpot, id: '3', type: 'beach' },
    ];
    const result = filterSpots(spots, f, null);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('club');
  });
});

// ---------------------------------------------------------------------------
// 3. Indoor spots never shown
// ---------------------------------------------------------------------------
describe('filterEdgeCases — indoor never shown', () => {
  it('hides indoor even with all toggles ON', () => {
    const f = filters();
    f.showExterieur = true;
    f.showClubs = true;
    expect(filterSpots([{ ...baseSpot, type: 'indoor' }], f, null)).toHaveLength(0);
  });

  it('hides indoor even with showPending=false', () => {
    expect(filterSpots([{ ...baseSpot, type: 'indoor' }], filters(), null)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Spots with null lat/lng still pass non-radius filters
// ---------------------------------------------------------------------------
describe('filterEdgeCases — null coordinates', () => {
  it('spot with null lat/lng still passes default filters', () => {
    const spot = { ...baseSpot, lat: null, lng: null };
    expect(filterSpots([spot], filters(), null)).toHaveLength(1);
  });

  it('spot with null lat only still passes', () => {
    const spot = { ...baseSpot, lat: null };
    expect(filterSpots([spot], filters(), null)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 5. Combined sub-filters: beach + eclairage + pmr
// ---------------------------------------------------------------------------
describe('filterEdgeCases — combined beach sub-filters', () => {
  it('beach spot with eclairage AND pmr passes when both required', () => {
    const f = filters();
    f.subFilters.beach_eclairage = true;
    f.subFilters.beach_pmr = true;
    const spot = { ...baseSpot, type: 'beach', equip_eclairage: true, equip_pmr: true };
    expect(filterSpots([spot], f, null)).toHaveLength(1);
  });

  it('beach spot missing eclairage fails when both required', () => {
    const f = filters();
    f.subFilters.beach_eclairage = true;
    f.subFilters.beach_pmr = true;
    const spot = { ...baseSpot, type: 'beach', equip_eclairage: false, equip_pmr: true };
    expect(filterSpots([spot], f, null)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 6. Combined sub-filters: green + sol naturel + saisonnier
// ---------------------------------------------------------------------------
describe('filterEdgeCases — combined green sub-filters', () => {
  it('green_volley with naturel sol AND saisonnier passes', () => {
    const f = filters();
    f.subFilters.green_sol = 'naturel';
    f.subFilters.green_saison = 'saisonnier';
    const spot = { ...baseSpot, type: 'green_volley', equip_sol: 'Gazon naturel', equip_saisonnier: true };
    expect(filterSpots([spot], f, null)).toHaveLength(1);
  });

  it('green_volley with wrong sol type fails even if saison matches', () => {
    const f = filters();
    f.subFilters.green_sol = 'naturel';
    f.subFilters.green_saison = 'saisonnier';
    const spot = { ...baseSpot, type: 'green_volley', equip_sol: 'Gazon synthétique', equip_saisonnier: true };
    expect(filterSpots([spot], f, null)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 7. Season filter 'annee' matches year-round availability
// ---------------------------------------------------------------------------
describe('filterEdgeCases — season annee', () => {
  it('beach_saison=annee keeps non-seasonal spots (equip_saisonnier=false)', () => {
    const f = filters();
    f.subFilters.beach_saison = 'annee';
    const spot = { ...baseSpot, type: 'beach', equip_saisonnier: false };
    expect(filterSpots([spot], f, null)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 8. Season filter 'saisonnier' matches seasonal availability
// ---------------------------------------------------------------------------
describe('filterEdgeCases — season saisonnier', () => {
  it('beach_saison=saisonnier keeps seasonal spots (equip_saisonnier=true)', () => {
    const f = filters();
    f.subFilters.beach_saison = 'saisonnier';
    const spot = { ...baseSpot, type: 'beach', equip_saisonnier: true };
    expect(filterSpots([spot], f, null)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 9. acces_libre filter with null equip_acces_libre
// ---------------------------------------------------------------------------
describe('filterEdgeCases — acces_libre with null', () => {
  it('excludes spot when equip_acces_libre is null and filter requires libre', () => {
    const f = filters();
    f.subFilters.acces_libre = true;
    const spot = { ...baseSpot, equip_acces_libre: null };
    expect(filterSpots([spot], f, null)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 10. Multiple type toggles: exterior ON + clubs ON shows both
// ---------------------------------------------------------------------------
describe('filterEdgeCases — multiple type toggles', () => {
  it('shows both exterior and clubs when both toggles are ON', () => {
    const f = filters();
    f.showExterieur = true;
    f.showClubs = true;
    const spots = [
      { ...baseSpot, id: '1', type: 'outdoor_hard' },
      { ...baseSpot, id: '2', type: 'club' },
    ];
    expect(filterSpots(spots, f, null)).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// 11. Empty spots array
// ---------------------------------------------------------------------------
describe('filterEdgeCases — empty input', () => {
  it('returns empty result for empty spots array', () => {
    expect(filterSpots([], filters(), null)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 12. Default filters return only validated exterior libre spots
// ---------------------------------------------------------------------------
describe('filterEdgeCases — defaults', () => {
  it('default filters return only validated exterior libre spots', () => {
    const spots = [
      { ...baseSpot, id: '1', equip_acces_libre: true },
      { ...baseSpot, id: '2', equip_acces_libre: false },
      { ...baseSpot, id: '3', type: 'club' },
      { ...baseSpot, id: '4', type: 'indoor' },
      { ...baseSpot, id: '5', status: 'waiting_for_validation' },
      { ...baseSpot, id: '6', status: 'rejected' },
    ];
    const result = filterSpots(spots, filters(), null);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });
});

// ---------------------------------------------------------------------------
// 13. Beach sub-type toggle
// ---------------------------------------------------------------------------
describe('filterEdgeCases — beach sub-type toggle', () => {
  it('only ext_beach=false hides beach spots, other exterior types remain', () => {
    const f = filters();
    f.subFilters.ext_beach = false;
    const spots = [
      { ...baseSpot, id: '1', type: 'beach' },
      { ...baseSpot, id: '2', type: 'outdoor_hard' },
      { ...baseSpot, id: '3', type: 'outdoor_grass' },
    ];
    const result = filterSpots(spots, f, null);
    expect(result).toHaveLength(2);
    expect(result.map(s => s.id)).not.toContain('1');
  });
});

// ---------------------------------------------------------------------------
// 14. Grass sub-type toggle
// ---------------------------------------------------------------------------
describe('filterEdgeCases — grass sub-type toggle', () => {
  it('only ext_herbe=false hides outdoor_grass spots', () => {
    const f = filters();
    f.subFilters.ext_herbe = false;
    const spots = [
      { ...baseSpot, id: '1', type: 'outdoor_grass' },
      { ...baseSpot, id: '2', type: 'outdoor_hard' },
      { ...baseSpot, id: '3', type: 'beach' },
    ];
    const result = filterSpots(spots, f, null);
    expect(result).toHaveLength(2);
    expect(result.map(s => s.id)).not.toContain('1');
  });
});

// ---------------------------------------------------------------------------
// 15. Hard sub-type toggle
// ---------------------------------------------------------------------------
describe('filterEdgeCases — hard sub-type toggle', () => {
  it('only ext_dur=false hides outdoor_hard spots', () => {
    const f = filters();
    f.subFilters.ext_dur = false;
    const spots = [
      { ...baseSpot, id: '1', type: 'outdoor_hard' },
      { ...baseSpot, id: '2', type: 'beach' },
      { ...baseSpot, id: '3', type: 'outdoor_grass' },
    ];
    const result = filterSpots(spots, f, null);
    expect(result).toHaveLength(2);
    expect(result.map(s => s.id)).not.toContain('1');
  });
});

// ---------------------------------------------------------------------------
// 16. Green volley follows ext_herbe toggle
// ---------------------------------------------------------------------------
describe('filterEdgeCases — green_volley follows ext_herbe', () => {
  it('green_volley is hidden when ext_herbe=false', () => {
    const f = filters();
    f.subFilters.ext_herbe = false;
    expect(filterSpots([{ ...baseSpot, type: 'green_volley' }], f, null)).toHaveLength(0);
  });

  it('green_volley is shown when ext_herbe=true', () => {
    expect(filterSpots([{ ...baseSpot, type: 'green_volley' }], filters(), null)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 17. Sub-panel filter: green_sol naturel vs synthetique
// ---------------------------------------------------------------------------
describe('filterEdgeCases — green_sol naturel vs synthetique', () => {
  it('green_sol=naturel excludes synthetique sol', () => {
    const f = filters();
    f.subFilters.green_sol = 'naturel';
    expect(filterSpots([{ ...baseSpot, type: 'green_volley', equip_sol: 'Gazon synthétique' }], f, null)).toHaveLength(0);
  });

  it('green_sol=synthetique excludes naturel sol', () => {
    const f = filters();
    f.subFilters.green_sol = 'synthetique';
    expect(filterSpots([{ ...baseSpot, type: 'green_volley', equip_sol: 'Gazon naturel' }], f, null)).toHaveLength(0);
  });

  it('green_sol=all passes both sol types', () => {
    const f = filters();
    f.subFilters.green_sol = 'all';
    expect(filterSpots([{ ...baseSpot, type: 'green_volley', equip_sol: 'Gazon naturel' }], f, null)).toHaveLength(1);
    expect(filterSpots([{ ...baseSpot, type: 'green_volley', equip_sol: 'Gazon synthétique' }], f, null)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 18. Pending mode ignores ALL other filters
// ---------------------------------------------------------------------------
describe('filterEdgeCases — pending mode', () => {
  it('pending mode shows waiting spots regardless of type or equipment', () => {
    const f = filters();
    f.showPending = true;
    f.showExterieur = false;
    f.showClubs = false;
    f.subFilters.acces_libre = true;
    const spots = [
      { ...baseSpot, id: '1', type: 'indoor', status: 'waiting_for_validation', equip_acces_libre: false },
      { ...baseSpot, id: '2', type: 'club', status: 'waiting_for_validation', equip_acces_libre: false },
      { ...baseSpot, id: '3', type: 'outdoor_hard', status: 'validated' },
    ];
    const result = filterSpots(spots, f, null);
    expect(result).toHaveLength(2);
    expect(result.map(s => s.id).sort()).toEqual(['1', '2']);
  });

  it('pending mode excludes validated and rejected spots', () => {
    const f = filters();
    f.showPending = true;
    const spots = [
      { ...baseSpot, id: '1', status: 'validated' },
      { ...baseSpot, id: '2', status: 'rejected' },
      { ...baseSpot, id: '3', status: 'waiting_for_validation' },
    ];
    const result = filterSpots(spots, f, null);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });
});
