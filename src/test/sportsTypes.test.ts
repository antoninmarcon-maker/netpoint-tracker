import { describe, it, expect } from 'vitest';
import {
  isOffensiveAction, isFaultAction,
  OFFENSIVE_ACTIONS, FAULT_ACTIONS, NEUTRAL_ACTIONS,
  getScoredActionsForSport, getFaultActionsForSport, getNeutralActionsForSport,
  getPeriodLabel, getSportIcon, OTHER_ACTION_KEYS,
} from '@/types/sports';

describe('isOffensiveAction', () => {
  it.each(['attack', 'ace', 'block', 'bidouille', 'seconde_main', 'other_offensive'] as const)(
    'returns true for %s', (action) => {
      expect(isOffensiveAction(action)).toBe(true);
    }
  );

  it.each(['out', 'net_fault', 'service_miss', 'block_out', 'gameplay_fault', 'timeout'] as const)(
    'returns false for %s', (action) => {
      expect(isOffensiveAction(action)).toBe(false);
    }
  );
});

describe('isFaultAction', () => {
  it.each(['out', 'net_fault', 'service_miss', 'block_out', 'gameplay_fault', 'other_volley_fault'] as const)(
    'returns true for %s', (action) => {
      expect(isFaultAction(action)).toBe(true);
    }
  );

  it.each(['attack', 'ace', 'block', 'timeout', 'other_volley_neutral'] as const)(
    'returns false for %s', (action) => {
      expect(isFaultAction(action)).toBe(false);
    }
  );
});

describe('action lists', () => {
  it('OFFENSIVE_ACTIONS has 6 entries', () => {
    expect(OFFENSIVE_ACTIONS).toHaveLength(6);
  });

  it('FAULT_ACTIONS has 6 entries', () => {
    expect(FAULT_ACTIONS).toHaveLength(6);
  });

  it('NEUTRAL_ACTIONS has 2 entries', () => {
    expect(NEUTRAL_ACTIONS).toHaveLength(2);
  });

  it('every action has key and label', () => {
    [...OFFENSIVE_ACTIONS, ...FAULT_ACTIONS, ...NEUTRAL_ACTIONS].forEach(a => {
      expect(a.key).toBeTruthy();
      expect(a.label).toBeTruthy();
    });
  });

  it('offensive and fault action keys do not overlap', () => {
    const offKeys = OFFENSIVE_ACTIONS.map(a => a.key);
    const faultKeys = FAULT_ACTIONS.map(a => a.key);
    offKeys.forEach(k => expect(faultKeys).not.toContain(k));
  });
});

describe('sport helper functions', () => {
  it('getScoredActionsForSport returns OFFENSIVE_ACTIONS', () => {
    expect(getScoredActionsForSport('volleyball')).toBe(OFFENSIVE_ACTIONS);
  });

  it('getFaultActionsForSport returns FAULT_ACTIONS', () => {
    expect(getFaultActionsForSport('volleyball')).toBe(FAULT_ACTIONS);
  });

  it('getNeutralActionsForSport returns NEUTRAL_ACTIONS', () => {
    expect(getNeutralActionsForSport('volleyball')).toBe(NEUTRAL_ACTIONS);
  });

  it('getPeriodLabel returns Set for volleyball', () => {
    expect(getPeriodLabel('volleyball')).toBe('Set');
  });

  it('getSportIcon returns volleyball emoji', () => {
    expect(getSportIcon('volleyball')).toBe('🏐');
    expect(getSportIcon()).toBe('🏐');
  });
});

describe('OTHER_ACTION_KEYS', () => {
  it('maps volleyball to correct other keys', () => {
    expect(OTHER_ACTION_KEYS.volleyball).toEqual({
      scored: 'other_offensive',
      fault: 'other_volley_fault',
      neutral: 'other_volley_neutral',
    });
  });
});
