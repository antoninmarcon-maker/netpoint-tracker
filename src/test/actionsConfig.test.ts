import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getActionsConfig, toggleActionVisibility, addCustomAction,
  updateCustomAction, deleteCustomAction, updateDefaultActionConfig,
  getCustomActionRealKey, getVisibleActions, getVisibleActionIdentifiers,
} from '@/lib/actionsConfig';
import { OFFENSIVE_ACTIONS } from '@/types/sports';
import { setActiveUserId } from '@/lib/userStorage';

// Mock cloud sync (requires supabase)
vi.mock('@/lib/cloudSettings', () => ({
  getCurrentUserId: vi.fn().mockResolvedValue(null),
  patchCloudSettings: vi.fn().mockResolvedValue(undefined),
}));

describe('actionsConfig', () => {
  beforeEach(() => {
    localStorage.clear();
    setActiveUserId(null);
  });

  describe('getActionsConfig', () => {
    it('returns default config when nothing saved', () => {
      const config = getActionsConfig();
      expect(config.hiddenActions).toContain('other_offensive');
      expect(config.customActions.length).toBeGreaterThan(0);
    });

    it('default custom actions include Réception, Passe, Défense, 3m', () => {
      const labels = getActionsConfig().customActions.map(a => a.label);
      expect(labels).toContain('Réception');
      expect(labels).toContain('Passe');
      expect(labels).toContain('Défense');
      expect(labels).toContain('3m');
    });
  });

  describe('toggleActionVisibility', () => {
    it('hides a visible action', () => {
      const config = toggleActionVisibility('attack');
      expect(config.hiddenActions).toContain('attack');
    });

    it('shows a hidden action', () => {
      toggleActionVisibility('attack'); // hide
      const config = toggleActionVisibility('attack'); // show
      expect(config.hiddenActions).not.toContain('attack');
    });

    it('is idempotent for toggle cycle', () => {
      const original = getActionsConfig().hiddenActions.length;
      toggleActionVisibility('ace');
      toggleActionVisibility('ace');
      expect(getActionsConfig().hiddenActions.length).toBe(original);
    });
  });

  describe('addCustomAction', () => {
    it('adds a new custom action', () => {
      const config = addCustomAction('Joker', 'volleyball', 'scored', undefined, 'JK');
      const joker = config.customActions.find(a => a.label === 'Joker');
      expect(joker).toBeTruthy();
      expect(joker!.sigil).toBe('JK');
      expect(joker!.sport).toBe('volleyball');
      expect(joker!.category).toBe('scored');
    });

    it('trims label', () => {
      const config = addCustomAction('  Smash  ', 'volleyball', 'scored');
      expect(config.customActions.find(a => a.label === 'Smash')).toBeTruthy();
    });

    it('truncates sigil to 2 chars and uppercases', () => {
      const config = addCustomAction('Long', 'volleyball', 'scored', undefined, 'abc');
      const action = config.customActions.find(a => a.label === 'Long');
      expect(action!.sigil).toBe('AB');
    });

    it('forces showOnCourt=true when hasDirection=true', () => {
      const config = addCustomAction('Dir', 'volleyball', 'neutral', undefined, 'DR', false, true, true);
      const action = config.customActions.find(a => a.label === 'Dir');
      expect(action!.showOnCourt).toBe(true);
      expect(action!.hasDirection).toBe(true);
    });

    it('defaults assignToPlayer to true', () => {
      const config = addCustomAction('Test', 'volleyball', 'scored');
      const action = config.customActions.find(a => a.label === 'Test');
      expect(action!.assignToPlayer).toBe(true);
    });
  });

  describe('updateCustomAction', () => {
    it('updates label and sigil', () => {
      addCustomAction('Old', 'volleyball', 'scored', undefined, 'OL');
      const id = getActionsConfig().customActions.find(a => a.label === 'Old')!.id;
      const config = updateCustomAction(id, 'New', undefined, 'NW');
      const updated = config.customActions.find(a => a.id === id);
      expect(updated!.label).toBe('New');
      expect(updated!.sigil).toBe('NW');
    });

    it('forces showOnCourt when hasDirection is set to true', () => {
      addCustomAction('Base', 'volleyball', 'scored', undefined, 'BA');
      const id = getActionsConfig().customActions.find(a => a.label === 'Base')!.id;
      const config = updateCustomAction(id, 'Base', undefined, undefined, false, undefined, true);
      expect(config.customActions.find(a => a.id === id)!.showOnCourt).toBe(true);
    });

    it('ignores non-existent id gracefully', () => {
      const config = updateCustomAction('fake-id', 'Whatever');
      expect(config).toBeTruthy(); // no crash
    });
  });

  describe('deleteCustomAction', () => {
    it('removes the action by id', () => {
      addCustomAction('ToDelete', 'volleyball', 'scored');
      const id = getActionsConfig().customActions.find(a => a.label === 'ToDelete')!.id;
      const config = deleteCustomAction(id);
      expect(config.customActions.find(a => a.id === id)).toBeUndefined();
    });

    it('does nothing for non-existent id', () => {
      const before = getActionsConfig().customActions.length;
      deleteCustomAction('nope');
      expect(getActionsConfig().customActions.length).toBe(before);
    });
  });

  describe('updateDefaultActionConfig', () => {
    it('creates override for a default action', () => {
      const config = updateDefaultActionConfig('attack', true, true, true);
      expect(config.defaultActionsConfig!['attack'].hasDirection).toBe(true);
      expect(config.defaultActionsConfig!['attack'].hasRating).toBe(true);
    });

    it('forces showOnCourt when hasDirection=true', () => {
      const config = updateDefaultActionConfig('ace', undefined, true);
      expect(config.defaultActionsConfig!['ace'].showOnCourt).toBe(true);
    });
  });

  describe('getCustomActionRealKey', () => {
    it('maps scored custom action to other_offensive', () => {
      expect(getCustomActionRealKey({ id: '1', label: 'X', sport: 'volleyball', category: 'scored' })).toBe('other_offensive');
    });

    it('maps fault custom action to other_volley_fault', () => {
      expect(getCustomActionRealKey({ id: '1', label: 'X', sport: 'volleyball', category: 'fault' })).toBe('other_volley_fault');
    });

    it('maps neutral custom action to other_volley_neutral', () => {
      expect(getCustomActionRealKey({ id: '1', label: 'X', sport: 'volleyball', category: 'neutral' })).toBe('other_volley_neutral');
    });
  });

  describe('getVisibleActions', () => {
    it('filters out hidden default actions by key', () => {
      // 'other_offensive' is hidden by default, but custom actions mapped to the same key still appear
      const visible = getVisibleActions('volleyball', 'scored', OFFENSIVE_ACTIONS as any);
      // Default actions without customId should not include hidden ones
      const defaultVisible = visible.filter(a => !a.customId);
      const keys = defaultVisible.map(a => a.key);
      expect(keys).not.toContain('other_offensive');
    });

    it('includes custom actions of the same category', () => {
      const visible = getVisibleActions('volleyball', 'scored', OFFENSIVE_ACTIONS as any);
      const labels = visible.map(a => a.label);
      expect(labels).toContain('3m'); // default custom scored action
    });

    it('applies default action config overrides', () => {
      const visible = getVisibleActions('volleyball', 'scored', OFFENSIVE_ACTIONS as any);
      const attack = visible.find(a => a.key === 'attack');
      expect(attack).toBeTruthy();
      // attack has hasDirection: true in default config
      expect(attack!.hasDirection).toBe(true);
    });
  });

  describe('getVisibleActionIdentifiers', () => {
    it('returns sets of visible keys and labels', () => {
      const { visibleKeys, visibleLabels } = getVisibleActionIdentifiers('volleyball');
      expect(visibleKeys.has('attack')).toBe(true);
      expect(visibleKeys.has('out')).toBe(true);
      expect(visibleLabels.has('Réception')).toBe(true);
    });

    it('custom actions appear as labels not keys', () => {
      const { visibleKeys, visibleLabels } = getVisibleActionIdentifiers('volleyball');
      expect(visibleLabels.has('Passe')).toBe(true);
      // custom action keys are 'other_*' so they shouldn't be in visibleKeys (they use customId path)
    });
  });
});
