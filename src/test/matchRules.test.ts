import { describe, it, expect } from 'vitest';
import { getActionRequirements } from '@/lib/matchRules';
import type { MatchMetadata } from '@/types/sports';

// Helper to create metadata with sensible defaults
const meta = (overrides?: Partial<MatchMetadata>): MatchMetadata => ({
  hasCourt: true,
  enableRatings: true,
  ...overrides,
});

describe('getActionRequirements', () => {
  // ── Player assignment ──
  describe('needsAssignToPlayer', () => {
    it('requires player for blue scored with players', () => {
      const r = getActionRequirements(true, 'blue', 'scored', 'attack', undefined, meta(), false);
      expect(r.needsAssignToPlayer).toBe(true);
    });

    it('requires player for red fault with players', () => {
      const r = getActionRequirements(true, 'red', 'fault', 'out', undefined, meta(), false);
      expect(r.needsAssignToPlayer).toBe(true);
    });

    it('requires player for neutral action with players', () => {
      const r = getActionRequirements(true, 'blue', 'neutral', 'timeout', undefined, meta(), false);
      expect(r.needsAssignToPlayer).toBe(true);
    });

    it('skips player when no players', () => {
      const r = getActionRequirements(false, 'blue', 'scored', 'attack', undefined, meta(), false);
      expect(r.needsAssignToPlayer).toBe(false);
    });

    it('skips player when assignToPlayer is false', () => {
      const r = getActionRequirements(true, 'blue', 'scored', 'attack', { assignToPlayer: false } as any, meta(), false);
      expect(r.needsAssignToPlayer).toBe(false);
    });

    it('skips player for red scored (opponent)', () => {
      const r = getActionRequirements(true, 'red', 'scored', 'attack', undefined, meta(), false);
      expect(r.needsAssignToPlayer).toBe(false);
    });

    it('skips player for blue fault (opponent fault)', () => {
      const r = getActionRequirements(true, 'blue', 'fault', 'out', undefined, meta(), false);
      expect(r.needsAssignToPlayer).toBe(false);
    });
  });

  // ── Court placement ──
  describe('needsCourtPlacement', () => {
    it('needs placement for a normal attack', () => {
      const r = getActionRequirements(true, 'blue', 'scored', 'attack', undefined, meta(), false);
      expect(r.needsCourtPlacement).toBe(true);
    });

    it('skips placement when hasCourt is false', () => {
      const r = getActionRequirements(true, 'blue', 'scored', 'attack', undefined, meta({ hasCourt: false }), false);
      expect(r.needsCourtPlacement).toBe(false);
    });

    it('skips placement when placeOnCourt is false', () => {
      const r = getActionRequirements(true, 'blue', 'scored', 'attack', { placeOnCourt: false } as any, meta(), false);
      expect(r.needsCourtPlacement).toBe(false);
    });

    it('skips placement for service_miss (auto-placed)', () => {
      const r = getActionRequirements(true, 'blue', 'scored', 'service_miss' as any, undefined, meta(), false);
      expect(r.needsCourtPlacement).toBe(false);
    });

    it('skips placement for gameplay_fault (auto-placed)', () => {
      const r = getActionRequirements(true, 'blue', 'scored', 'gameplay_fault' as any, undefined, meta(), false);
      expect(r.needsCourtPlacement).toBe(false);
    });

    it('skips placement for timeout (auto-placed)', () => {
      const r = getActionRequirements(true, 'blue', 'neutral', 'timeout', undefined, meta(), false);
      expect(r.needsCourtPlacement).toBe(false);
    });
  });

  // ── Rating ──
  describe('needsRating', () => {
    it('needs rating for blue scored attack when global ratings on', () => {
      const r = getActionRequirements(true, 'blue', 'scored', 'attack', undefined, meta(), false);
      expect(r.needsRating).toBe(true);
    });

    it('never needs rating for faults', () => {
      const r = getActionRequirements(true, 'red', 'fault', 'out', undefined, meta(), false);
      expect(r.needsRating).toBe(false);
    });

    it('skips rating when global ratings disabled and no per-action rating', () => {
      const r = getActionRequirements(true, 'blue', 'scored', 'attack', undefined, meta({ enableRatings: false }), false);
      expect(r.needsRating).toBe(false);
    });

    it('needs rating when global off but per-action hasRating is true', () => {
      const r = getActionRequirements(true, 'blue', 'scored', 'attack', { hasRating: true } as any, meta({ enableRatings: false }), false);
      expect(r.needsRating).toBe(true);
    });

    it('skips rating for timeout even if ratings enabled', () => {
      const r = getActionRequirements(true, 'blue', 'neutral', 'timeout', undefined, meta(), false);
      expect(r.needsRating).toBe(false);
    });

    it('skips rating for non-eligible actions (red scored)', () => {
      const r = getActionRequirements(true, 'red', 'scored', 'attack', undefined, meta(), false);
      expect(r.needsRating).toBe(false);
    });
  });

  // ── Direction ──
  describe('needsDirection', () => {
    it('needs direction when performance mode + hasCourt + meta.hasDirection', () => {
      const r = getActionRequirements(true, 'blue', 'scored', 'attack', { hasDirection: true } as any, meta(), true);
      expect(r.needsDirection).toBe(true);
    });

    it('skips direction when not in performance mode', () => {
      const r = getActionRequirements(true, 'blue', 'scored', 'attack', { hasDirection: true } as any, meta(), false);
      expect(r.needsDirection).toBe(false);
    });

    it('skips direction when hasCourt is false', () => {
      const r = getActionRequirements(true, 'blue', 'scored', 'attack', { hasDirection: true } as any, meta({ hasCourt: false }), true);
      expect(r.needsDirection).toBe(false);
    });

    it('skips direction when meta.hasDirection is absent', () => {
      const r = getActionRequirements(true, 'blue', 'scored', 'attack', undefined, meta(), true);
      expect(r.needsDirection).toBe(false);
    });
  });

  // ── Auto-point ──
  describe('isAutoPoint', () => {
    it('auto-point when hasCourt is false', () => {
      const r = getActionRequirements(true, 'blue', 'scored', 'attack', undefined, meta({ hasCourt: false }), false);
      expect(r.isAutoPoint).toBe(true);
    });

    it('auto-point for service_miss', () => {
      const r = getActionRequirements(true, 'blue', 'scored', 'service_miss' as any, undefined, meta(), false);
      expect(r.isAutoPoint).toBe(true);
    });

    it('auto-point when placeOnCourt is false', () => {
      const r = getActionRequirements(true, 'blue', 'scored', 'attack', { placeOnCourt: false } as any, meta(), false);
      expect(r.isAutoPoint).toBe(true);
    });

    it('not auto-point for normal attack with court', () => {
      const r = getActionRequirements(true, 'blue', 'scored', 'attack', undefined, meta(), false);
      expect(r.isAutoPoint).toBe(false);
    });
  });

  // ── Combined scenarios ──
  describe('combined scenarios', () => {
    it('performance mode attack: needs direction + rating + player + court', () => {
      const r = getActionRequirements(true, 'blue', 'scored', 'attack', { hasDirection: true, hasRating: true } as any, meta(), true);
      expect(r.needsAssignToPlayer).toBe(true);
      expect(r.needsCourtPlacement).toBe(true);
      expect(r.needsRating).toBe(true);
      expect(r.needsDirection).toBe(true);
      expect(r.isAutoPoint).toBe(false);
    });

    it('no-court mode: auto-point, no court placement, but still needs player', () => {
      const r = getActionRequirements(true, 'blue', 'scored', 'attack', undefined, meta({ hasCourt: false }), false);
      expect(r.needsAssignToPlayer).toBe(true);
      expect(r.needsCourtPlacement).toBe(false);
      expect(r.isAutoPoint).toBe(true);
    });

    it('null metadata defaults gracefully', () => {
      const r = getActionRequirements(true, 'blue', 'scored', 'attack', undefined, null, false);
      expect(r.needsCourtPlacement).toBe(true);
      expect(r.needsRating).toBe(true);
    });
  });
});
