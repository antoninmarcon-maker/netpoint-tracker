import { describe, it, expect, beforeEach } from 'vitest';
import { userStorage, getNamespacedKey, setActiveUserId, activeUserId } from '@/lib/userStorage';

describe('userStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    setActiveUserId(null); // reset to guest
  });

  describe('getNamespacedKey', () => {
    it('appends guest suffix by default', () => {
      expect(getNamespacedKey('test-key')).toBe('test-key_guest');
    });

    it('appends user id when logged in', () => {
      setActiveUserId('user-123');
      expect(getNamespacedKey('test-key')).toBe('test-key_user-123');
    });
  });

  describe('setItem / getItem', () => {
    it('stores and retrieves values', () => {
      userStorage.setItem('mykey', 'myvalue');
      expect(userStorage.getItem('mykey')).toBe('myvalue');
    });

    it('returns null for missing keys', () => {
      expect(userStorage.getItem('missing')).toBeNull();
    });

    it('namespaces keys per user', () => {
      userStorage.setItem('shared', 'guest-val');
      setActiveUserId('user-A');
      userStorage.setItem('shared', 'userA-val');

      expect(userStorage.getItem('shared')).toBe('userA-val');
      setActiveUserId(null);
      expect(userStorage.getItem('shared')).toBe('guest-val');
    });
  });

  describe('removeItem', () => {
    it('removes namespaced key', () => {
      userStorage.setItem('delme', 'val');
      userStorage.removeItem('delme');
      expect(userStorage.getItem('delme')).toBeNull();
    });
  });

  describe('legacy key migration (guest)', () => {
    it('migrates old global key to guest namespace', () => {
      // Simulate old data stored without namespace
      localStorage.setItem('old-key', 'legacy-data');
      const value = userStorage.getItem('old-key');
      expect(value).toBe('legacy-data');
      // Old key should be removed after migration
      expect(localStorage.getItem('old-key')).toBeNull();
      // New namespaced key should exist
      expect(localStorage.getItem('old-key_guest')).toBe('legacy-data');
    });

    it('does not migrate when logged in as user', () => {
      localStorage.setItem('old-key', 'legacy-data');
      setActiveUserId('user-X');
      expect(userStorage.getItem('old-key')).toBeNull();
      // Old key untouched
      expect(localStorage.getItem('old-key')).toBe('legacy-data');
    });
  });

  describe('getGuestItem', () => {
    it('reads guest namespaced key', () => {
      localStorage.setItem('base_guest', 'guest-data');
      expect(userStorage.getGuestItem('base')).toBe('guest-data');
    });

    it('falls back to global key', () => {
      localStorage.setItem('base', 'global-data');
      expect(userStorage.getGuestItem('base')).toBe('global-data');
    });
  });

  describe('clearGuestItem', () => {
    it('removes both guest and global keys', () => {
      localStorage.setItem('base_guest', 'a');
      localStorage.setItem('base', 'b');
      userStorage.clearGuestItem('base');
      expect(localStorage.getItem('base_guest')).toBeNull();
      expect(localStorage.getItem('base')).toBeNull();
    });
  });
});
