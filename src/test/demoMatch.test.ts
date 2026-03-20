import { describe, it, expect } from 'vitest';
import { getDemoMatch, DEMO_MATCH_ID } from '@/lib/demoMatch';

describe('getDemoMatch', () => {
  const demo = getDemoMatch();

  it('has the correct demo ID', () => {
    expect(demo.id).toBe(DEMO_MATCH_ID);
  });

  it('has both team names', () => {
    expect(demo.teamNames.blue).toBeTruthy();
    expect(demo.teamNames.red).toBeTruthy();
  });

  it('has 6 players', () => {
    expect(demo.players).toHaveLength(6);
  });

  it('every player has id, name and number', () => {
    demo.players!.forEach(p => {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.number).toBeTruthy();
    });
  });

  it('has 1 completed set', () => {
    expect(demo.completedSets).toHaveLength(1);
  });

  it('completed set has a winner', () => {
    expect(demo.completedSets[0].winner).toBe('blue');
  });

  it('completed set score is 25-23', () => {
    expect(demo.completedSets[0].score).toEqual({ blue: 25, red: 23 });
  });

  it('completed set has points', () => {
    expect(demo.completedSets[0].points.length).toBeGreaterThan(0);
  });

  it('current set is 2 (in progress)', () => {
    expect(demo.currentSetNumber).toBe(2);
  });

  it('has current set points', () => {
    expect(demo.points.length).toBeGreaterThan(0);
  });

  it('is not finished', () => {
    expect(demo.finished).toBe(false);
  });

  it('has volleyball as sport', () => {
    expect(demo.sport).toBe('volleyball');
  });

  it('has court enabled in metadata', () => {
    expect(demo.metadata?.hasCourt).toBe(true);
  });

  it('all points have required fields', () => {
    const allPoints = [...demo.completedSets[0].points, ...demo.points];
    allPoints.forEach(p => {
      expect(p.id).toBeTruthy();
      expect(['blue', 'red']).toContain(p.team);
      expect(['scored', 'fault']).toContain(p.type);
      expect(p.action).toBeTruthy();
      expect(typeof p.x).toBe('number');
      expect(typeof p.y).toBe('number');
      expect(typeof p.timestamp).toBe('number');
    });
  });

  it('blue player points reference valid player IDs', () => {
    const playerIds = new Set(demo.players!.map(p => p.id));
    const allPoints = [...demo.completedSets[0].points, ...demo.points];
    allPoints.filter(p => p.playerId).forEach(p => {
      expect(playerIds.has(p.playerId!)).toBe(true);
    });
  });

  it('chrono is pre-filled', () => {
    expect(demo.chronoSeconds).toBeGreaterThan(0);
  });
});
