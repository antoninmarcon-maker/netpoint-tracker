import { describe, it, expect } from 'vitest';
import { filterSpots, getDistance } from '@/lib/filterSpots';
import { DEFAULT_FILTERS, DEFAULT_SUB_FILTERS, EXTERIOR_TYPES, type SpotFiltersState } from '@/components/spots/SpotFilters';

const baseSpot = {
  id: '1',
  name: 'Test',
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
// Default filter values
// ---------------------------------------------------------------------------
describe('Default filter state', () => {
  it('shows exterior spots by default', () => {
    expect(DEFAULT_FILTERS.showExterieur).toBe(true);
  });

  it('hides clubs by default', () => {
    expect(DEFAULT_FILTERS.showClubs).toBe(false);
  });

  it('requires libre accès by default', () => {
    expect(DEFAULT_FILTERS.subFilters.acces_libre).toBe(true);
  });

  it('does not show pending spots by default', () => {
    expect(DEFAULT_FILTERS.showPending).toBe(false);
  });

  it('has no radius filter by default', () => {
    expect(DEFAULT_FILTERS.radiusKm).toBeNull();
  });

  it('shows all exterior sub-types by default', () => {
    expect(DEFAULT_SUB_FILTERS.ext_beach).toBe(true);
    expect(DEFAULT_SUB_FILTERS.ext_herbe).toBe(true);
    expect(DEFAULT_SUB_FILTERS.ext_dur).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// EXTERIOR_TYPES constant
// ---------------------------------------------------------------------------
describe('EXTERIOR_TYPES', () => {
  it('includes beach, green_volley, outdoor_hard, outdoor_grass', () => {
    expect(EXTERIOR_TYPES).toContain('beach');
    expect(EXTERIOR_TYPES).toContain('green_volley');
    expect(EXTERIOR_TYPES).toContain('outdoor_hard');
    expect(EXTERIOR_TYPES).toContain('outdoor_grass');
  });

  it('does NOT include indoor or club', () => {
    expect(EXTERIOR_TYPES).not.toContain('indoor');
    expect(EXTERIOR_TYPES).not.toContain('club');
  });
});

// ---------------------------------------------------------------------------
// Basic filter logic
// ---------------------------------------------------------------------------
describe('filterSpots — basics', () => {
  it('shows validated outdoor spots with default filters', () => {
    expect(filterSpots([baseSpot], filters(), null)).toHaveLength(1);
  });

  it('hides non-validated spots (status=pending)', () => {
    expect(filterSpots([{ ...baseSpot, status: 'pending' }], filters(), null)).toHaveLength(0);
  });

  it('hides rejected spots', () => {
    expect(filterSpots([{ ...baseSpot, status: 'rejected' }], filters(), null)).toHaveLength(0);
  });

  it('hides indoor spots regardless of filters', () => {
    expect(filterSpots([{ ...baseSpot, type: 'indoor', status: 'validated' }], filters(), null)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Category gates
// ---------------------------------------------------------------------------
describe('filterSpots — category gates', () => {
  it('hides clubs when showClubs=false (default)', () => {
    expect(filterSpots([{ ...baseSpot, type: 'club' }], filters(), null)).toHaveLength(0);
  });

  it('shows clubs when showClubs=true', () => {
    const f = filters();
    f.showClubs = true;
    expect(filterSpots([{ ...baseSpot, type: 'club' }], f, null)).toHaveLength(1);
  });

  it('hides exterior when showExterieur=false', () => {
    const f = filters();
    f.showExterieur = false;
    expect(filterSpots([baseSpot], f, null)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Exterior sub-type gates
// ---------------------------------------------------------------------------
describe('filterSpots — exterior sub-types', () => {
  it('hides beach spots when ext_beach=false', () => {
    const f = filters();
    f.subFilters.ext_beach = false;
    expect(filterSpots([{ ...baseSpot, type: 'beach' }], f, null)).toHaveLength(0);
  });

  it('shows beach spots when ext_beach=true', () => {
    expect(filterSpots([{ ...baseSpot, type: 'beach' }], filters(), null)).toHaveLength(1);
  });

  it('hides outdoor_hard when ext_dur=false', () => {
    const f = filters();
    f.subFilters.ext_dur = false;
    expect(filterSpots([baseSpot], f, null)).toHaveLength(0);
  });

  it('hides outdoor_grass when ext_herbe=false', () => {
    const f = filters();
    f.subFilters.ext_herbe = false;
    expect(filterSpots([{ ...baseSpot, type: 'outdoor_grass' }], f, null)).toHaveLength(0);
  });

  it('hides green_volley when ext_herbe=false', () => {
    const f = filters();
    f.subFilters.ext_herbe = false;
    expect(filterSpots([{ ...baseSpot, type: 'green_volley' }], f, null)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Equipment filters
// ---------------------------------------------------------------------------
describe('filterSpots — equipment filters', () => {
  it('hides spots without libre accès when acces_libre=true', () => {
    const f = filters();
    f.subFilters.acces_libre = true;
    expect(filterSpots([{ ...baseSpot, equip_acces_libre: false }], f, null)).toHaveLength(0);
  });

  it('shows spots without libre accès when acces_libre=false', () => {
    const f = filters();
    f.subFilters.acces_libre = false;
    expect(filterSpots([{ ...baseSpot, equip_acces_libre: false }], f, null)).toHaveLength(1);
  });

  it('beach: filters by éclairage', () => {
    const f = filters();
    f.subFilters.beach_eclairage = true;
    expect(filterSpots([{ ...baseSpot, type: 'beach', equip_eclairage: false }], f, null)).toHaveLength(0);
    expect(filterSpots([{ ...baseSpot, type: 'beach', equip_eclairage: true }], f, null)).toHaveLength(1);
  });

  it('beach: filters by PMR', () => {
    const f = filters();
    f.subFilters.beach_pmr = true;
    expect(filterSpots([{ ...baseSpot, type: 'beach', equip_pmr: false }], f, null)).toHaveLength(0);
    expect(filterSpots([{ ...baseSpot, type: 'beach', equip_pmr: true }], f, null)).toHaveLength(1);
  });

  it('beach: saison=annee hides seasonal spots', () => {
    const f = filters();
    f.subFilters.beach_saison = 'annee';
    expect(filterSpots([{ ...baseSpot, type: 'beach', equip_saisonnier: true }], f, null)).toHaveLength(0);
    expect(filterSpots([{ ...baseSpot, type: 'beach', equip_saisonnier: false }], f, null)).toHaveLength(1);
  });

  it('beach: saison=saisonnier hides year-round spots', () => {
    const f = filters();
    f.subFilters.beach_saison = 'saisonnier';
    expect(filterSpots([{ ...baseSpot, type: 'beach', equip_saisonnier: false }], f, null)).toHaveLength(0);
    expect(filterSpots([{ ...baseSpot, type: 'beach', equip_saisonnier: true }], f, null)).toHaveLength(1);
  });

  it('green_volley: filters by sol naturel', () => {
    const f = filters();
    f.subFilters.green_sol = 'naturel';
    expect(filterSpots([{ ...baseSpot, type: 'green_volley', equip_sol: 'Gazon synthétique' }], f, null)).toHaveLength(0);
    expect(filterSpots([{ ...baseSpot, type: 'green_volley', equip_sol: 'Gazon naturel' }], f, null)).toHaveLength(1);
  });

  it('green_volley: filters by sol synthétique', () => {
    const f = filters();
    f.subFilters.green_sol = 'synthetique';
    expect(filterSpots([{ ...baseSpot, type: 'green_volley', equip_sol: 'Gazon naturel' }], f, null)).toHaveLength(0);
    expect(filterSpots([{ ...baseSpot, type: 'green_volley', equip_sol: 'Gazon synthétique' }], f, null)).toHaveLength(1);
  });

  it('green_volley: saison filters work like beach', () => {
    const f = filters();
    f.subFilters.green_saison = 'annee';
    expect(filterSpots([{ ...baseSpot, type: 'green_volley', equip_saisonnier: true }], f, null)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Pending filter
// ---------------------------------------------------------------------------
describe('filterSpots — pending', () => {
  it('shows only waiting_for_validation spots when showPending=true', () => {
    const spots = [
      { ...baseSpot, status: 'validated' },
      { ...baseSpot, id: '2', status: 'waiting_for_validation' },
      { ...baseSpot, id: '3', status: 'rejected' },
    ];
    const f = filters();
    f.showPending = true;
    const result = filterSpots(spots, f, null);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('waiting_for_validation');
  });

  it('ignores other filters when showPending=true', () => {
    const spot = { ...baseSpot, type: 'indoor', status: 'waiting_for_validation', equip_acces_libre: false };
    const f = filters();
    f.showPending = true;
    expect(filterSpots([spot], f, null)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Radius filter
// ---------------------------------------------------------------------------
describe('filterSpots — radius', () => {
  it('excludes spots outside range', () => {
    const userPos: [number, number] = [43.2965, 5.3698]; // Marseille
    const f = filters();
    f.radiusKm = 50;
    expect(filterSpots([baseSpot], f, userPos)).toHaveLength(0); // Paris ≈775km
  });

  it('includes spots within range', () => {
    const userPos: [number, number] = [48.8566, 2.3522]; // Same as spot
    const f = filters();
    f.radiusKm = 50;
    expect(filterSpots([baseSpot], f, userPos)).toHaveLength(1);
  });

  it('ignores radius when radiusKm is null', () => {
    const userPos: [number, number] = [43.2965, 5.3698]; // Marseille
    const f = filters();
    f.radiusKm = null;
    expect(filterSpots([baseSpot], f, userPos)).toHaveLength(1);
  });

  it('ignores radius when userPosition is null', () => {
    const f = filters();
    f.radiusKm = 50;
    expect(filterSpots([baseSpot], f, null)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// getDistance (Haversine)
// ---------------------------------------------------------------------------
describe('getDistance', () => {
  it('returns 0 for same coordinates', () => {
    expect(getDistance(48.8566, 2.3522, 48.8566, 2.3522)).toBe(0);
  });

  it('Paris to Marseille ≈ 660-780 km', () => {
    const dist = getDistance(48.8566, 2.3522, 43.2965, 5.3698);
    expect(dist).toBeGreaterThan(650);
    expect(dist).toBeLessThan(800);
  });

  it('short distance: ~1km between two nearby points', () => {
    const dist = getDistance(48.8566, 2.3522, 48.8576, 2.3622);
    expect(dist).toBeGreaterThan(0.5);
    expect(dist).toBeLessThan(2);
  });
});

// ---------------------------------------------------------------------------
// Combined filter scenarios
// ---------------------------------------------------------------------------
describe('filterSpots — combined scenarios', () => {
  it('default filters show only validated outdoor libre-accès spots', () => {
    const spots = [
      { ...baseSpot, id: '1', equip_acces_libre: true, status: 'validated' },
      { ...baseSpot, id: '2', equip_acces_libre: false, status: 'validated' },
      { ...baseSpot, id: '3', type: 'club', status: 'validated' },
      { ...baseSpot, id: '4', type: 'indoor', status: 'validated' },
      { ...baseSpot, id: '5', status: 'waiting_for_validation' },
    ];
    const result = filterSpots(spots, filters(), null);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('multiple exterior types with mixed sub-filters', () => {
    const spots = [
      { ...baseSpot, id: '1', type: 'beach' },
      { ...baseSpot, id: '2', type: 'outdoor_hard' },
      { ...baseSpot, id: '3', type: 'green_volley' },
    ];
    const f = filters();
    f.subFilters.ext_beach = false; // Hide beach
    const result = filterSpots(spots, f, null);
    expect(result).toHaveLength(2);
    expect(result.map(s => s.type)).toContain('outdoor_hard');
    expect(result.map(s => s.type)).toContain('green_volley');
  });

  it('empty spot array returns empty', () => {
    expect(filterSpots([], filters(), null)).toHaveLength(0);
  });
});
