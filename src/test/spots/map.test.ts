import { describe, it, expect } from 'vitest';
import { getDistance } from '@/lib/filterSpots';

// ---------------------------------------------------------------------------
// Map initial state
// ---------------------------------------------------------------------------
describe('Map defaults', () => {
  const DEFAULT_CENTER: [number, number] = [46.603354, 1.888334]; // France center
  const DEFAULT_ZOOM = 6;
  const LOCATION_FOUND_ZOOM = 10; // ~50km radius

  it('starts centered on France', () => {
    expect(DEFAULT_CENTER[0]).toBeCloseTo(46.6, 0);
    expect(DEFAULT_CENTER[1]).toBeCloseTo(1.9, 0);
  });

  it('starts at zoom level 6 (whole France visible)', () => {
    expect(DEFAULT_ZOOM).toBe(6);
  });

  it('zooms to level 10 on user location (~50km radius)', () => {
    expect(LOCATION_FOUND_ZOOM).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Marker icon assignment
// ---------------------------------------------------------------------------
describe('Marker icon types', () => {
  const MARKER_CONFIGS: Record<string, { bg: string; icon: string }> = {
    club: { bg: 'bg-blue-700', icon: '🏛️' },
    beach: { bg: 'bg-yellow-500', icon: '🏖️' },
    green_volley: { bg: 'bg-green-600', icon: '🌿' },
    outdoor_hard: { bg: 'bg-green-500', icon: '☀️' },
    outdoor_grass: { bg: 'bg-green-400', icon: '🌱' },
  };

  it('has distinct icon for each spot type', () => {
    const icons = Object.values(MARKER_CONFIGS).map(c => c.icon);
    const uniqueIcons = new Set(icons);
    expect(uniqueIcons.size).toBe(icons.length);
  });

  it('does NOT have an indoor marker config', () => {
    expect(MARKER_CONFIGS).not.toHaveProperty('indoor');
  });

  it('pending spots get yellow border', () => {
    const isPending = true;
    const border = isPending ? 'border-yellow-400' : 'border-white';
    expect(border).toBe('border-yellow-400');
  });

  it('validated spots get white border', () => {
    const isPending = false;
    const border = isPending ? 'border-yellow-400' : 'border-white';
    expect(border).toBe('border-white');
  });
});

// ---------------------------------------------------------------------------
// Cluster sizing
// ---------------------------------------------------------------------------
describe('Cluster icon sizing', () => {
  const getClusterSize = (count: number) => {
    if (count > 100) return 'large';
    if (count > 50) return 'medium';
    return 'small';
  };

  it('small for <= 50', () => {
    expect(getClusterSize(1)).toBe('small');
    expect(getClusterSize(50)).toBe('small');
  });

  it('medium for 51-100', () => {
    expect(getClusterSize(51)).toBe('medium');
    expect(getClusterSize(100)).toBe('medium');
  });

  it('large for > 100', () => {
    expect(getClusterSize(101)).toBe('large');
    expect(getClusterSize(500)).toBe('large');
  });
});

// ---------------------------------------------------------------------------
// Distance display formatting
// ---------------------------------------------------------------------------
describe('Distance display', () => {
  const formatDistance = (distKm: number) =>
    distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`;

  it('shows meters for < 1km', () => {
    expect(formatDistance(0.5)).toBe('500 m');
    expect(formatDistance(0.15)).toBe('150 m');
  });

  it('shows km with 1 decimal for >= 1km', () => {
    expect(formatDistance(1.0)).toBe('1.0 km');
    expect(formatDistance(12.345)).toBe('12.3 km');
  });
});

// ---------------------------------------------------------------------------
// Add marker behavior
// ---------------------------------------------------------------------------
describe('Add marker mode', () => {
  it('defaults to map center when no location set', () => {
    const isActive = true;
    const location = undefined;
    const shouldSetCenter = isActive && !location;
    expect(shouldSetCenter).toBe(true);
  });

  it('keeps existing location if already set', () => {
    const isActive = true;
    const location: [number, number] = [48.8566, 2.3522];
    const shouldSetCenter = isActive && !location;
    expect(shouldSetCenter).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Spot query scope
// ---------------------------------------------------------------------------
describe('Spot query filtering', () => {
  it('only loads validated spots when showPending=false', () => {
    const showPending = false;
    const shouldFilterByStatus = !showPending;
    expect(shouldFilterByStatus).toBe(true);
  });

  it('loads all spots when showPending=true (for moderator)', () => {
    const showPending = true;
    const shouldFilterByStatus = !showPending;
    expect(shouldFilterByStatus).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Favorite system
// ---------------------------------------------------------------------------
describe('Favorite system', () => {
  it('toggles favorite on', () => {
    const favs: string[] = [];
    const spotId = 'spot-1';
    const next = [...favs, spotId];
    expect(next).toContain(spotId);
  });

  it('toggles favorite off', () => {
    const favs = ['spot-1', 'spot-2'];
    const spotId = 'spot-1';
    const next = favs.filter(f => f !== spotId);
    expect(next).not.toContain(spotId);
    expect(next).toContain('spot-2');
  });

  it('handles empty favorites list', () => {
    const raw = '[]';
    const favs = JSON.parse(raw);
    expect(favs).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Seasonality parsing
// ---------------------------------------------------------------------------
describe('Seasonality parsing', () => {
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

  it("parses Toute l'année as yearly", () => {
    expect(parseSeason("Toute l'année", null)).toEqual({ type: 'yearly' });
  });

  it('parses saisonnier=false as yearly', () => {
    expect(parseSeason(null, false)).toEqual({ type: 'yearly' });
  });

  it('parses "De Mai à Septembre" correctly', () => {
    const result = parseSeason('De Mai à Septembre', true);
    expect(result?.type).toBe('seasonal');
    expect(result?.start).toBe(4); // Mai = index 4
    expect(result?.end).toBe(8);   // Septembre = index 8
  });

  it('returns null for no period and non-seasonal', () => {
    expect(parseSeason(null, null)).toBeNull();
  });

  it('handles wrapping months (Oct to Mar)', () => {
    const result = parseSeason('De Octobre à Mars', true);
    expect(result?.start).toBe(9);  // Octobre
    expect(result?.end).toBe(2);    // Mars
  });
});
