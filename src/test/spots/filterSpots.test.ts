import { describe, it, expect } from 'vitest';
import { filterSpots } from '@/lib/filterSpots';
import { DEFAULT_FILTERS, type SpotFiltersState } from '@/components/spots/SpotFilters';

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

describe('filterSpots', () => {
  it('shows validated outdoor spots by default', () => {
    const spots = [baseSpot];
    const result = filterSpots(spots, filters(), null);
    expect(result).toHaveLength(1);
  });

  it('hides non-validated spots', () => {
    const spots = [{ ...baseSpot, status: 'pending' }];
    const result = filterSpots(spots, filters(), null);
    expect(result).toHaveLength(0);
  });

  it('hides indoor spots regardless of filter state', () => {
    const spots = [{ ...baseSpot, type: 'indoor', status: 'validated' }];
    const result = filterSpots(spots, filters(), null);
    expect(result).toHaveLength(0);
  });

  it('hides clubs when showClubs is false (default)', () => {
    const spots = [{ ...baseSpot, type: 'club' }];
    const result = filterSpots(spots, filters(), null);
    expect(result).toHaveLength(0);
  });

  it('shows clubs when showClubs is true', () => {
    const spots = [{ ...baseSpot, type: 'club' }];
    const f = filters();
    f.showClubs = true;
    const result = filterSpots(spots, f, null);
    expect(result).toHaveLength(1);
  });

  it('hides exterior spots when showExterieur is false', () => {
    const spots = [baseSpot];
    const f = filters();
    f.showExterieur = false;
    const result = filterSpots(spots, f, null);
    expect(result).toHaveLength(0);
  });

  it('filters by acces_libre: hides spots without free access when active', () => {
    const spots = [{ ...baseSpot, equip_acces_libre: false }];
    const f = filters();
    f.subFilters.acces_libre = true;
    const result = filterSpots(spots, f, null);
    expect(result).toHaveLength(0);
  });

  it('shows spots without free access when acces_libre filter is off', () => {
    const spots = [{ ...baseSpot, equip_acces_libre: false }];
    const f = filters();
    f.subFilters.acces_libre = false;
    const result = filterSpots(spots, f, null);
    expect(result).toHaveLength(1);
  });

  it('pending filter shows only waiting_for_validation spots', () => {
    const spots = [
      { ...baseSpot, status: 'validated' },
      { ...baseSpot, id: '2', status: 'waiting_for_validation' },
    ];
    const f = filters();
    f.showPending = true;
    const result = filterSpots(spots, f, null);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('waiting_for_validation');
  });

  it('filters by radius: excludes spots outside range', () => {
    // Spot is in Paris, user is in Marseille (~775km away)
    const userPosition: [number, number] = [43.2965, 5.3698];
    const spots = [baseSpot]; // Paris
    const f = filters();
    f.radiusKm = 50;
    const result = filterSpots(spots, f, userPosition);
    expect(result).toHaveLength(0);
  });

  it('filters by radius: includes spots within range', () => {
    const userPosition: [number, number] = [48.8566, 2.3522]; // same as spot
    const spots = [baseSpot];
    const f = filters();
    f.radiusKm = 50;
    const result = filterSpots(spots, f, userPosition);
    expect(result).toHaveLength(1);
  });

  it('beach sub-filter: hides beach spots when ext_beach is false', () => {
    const spots = [{ ...baseSpot, type: 'beach' }];
    const f = filters();
    f.subFilters.ext_beach = false;
    const result = filterSpots(spots, f, null);
    expect(result).toHaveLength(0);
  });

  it('outdoor_hard sub-filter: hides hard spots when ext_dur is false', () => {
    const spots = [baseSpot];
    const f = filters();
    f.subFilters.ext_dur = false;
    const result = filterSpots(spots, f, null);
    expect(result).toHaveLength(0);
  });

  it('outdoor_grass sub-filter: hides grass spots when ext_herbe is false', () => {
    const spots = [{ ...baseSpot, type: 'outdoor_grass' }];
    const f = filters();
    f.subFilters.ext_herbe = false;
    const result = filterSpots(spots, f, null);
    expect(result).toHaveLength(0);
  });
});
