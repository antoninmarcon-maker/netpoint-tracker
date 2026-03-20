import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkAndIncrementRateLimit } from '@/lib/rateLimit';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

const STORAGE_KEY = 'myvolley_daily_actions';

describe('checkAndIncrementRateLimit', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('allows first action of the day', () => {
    expect(checkAndIncrementRateLimit()).toBe(true);
  });

  it('increments counter', () => {
    checkAndIncrementRateLimit();
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(data.count).toBe(1);
  });

  it('allows up to 10 actions', () => {
    for (let i = 0; i < 10; i++) {
      expect(checkAndIncrementRateLimit()).toBe(true);
    }
  });

  it('blocks 11th action', () => {
    for (let i = 0; i < 10; i++) checkAndIncrementRateLimit();
    expect(checkAndIncrementRateLimit()).toBe(false);
  });

  it('resets counter on new day', () => {
    const yesterday = new Date(Date.now() - 86400_000).toISOString().split('T')[0];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: yesterday, count: 10 }));
    expect(checkAndIncrementRateLimit()).toBe(true);
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(data.count).toBe(1);
  });

  it('handles corrupted localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');
    expect(checkAndIncrementRateLimit()).toBe(true);
  });

  it('stores today date', () => {
    checkAndIncrementRateLimit();
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    const today = new Date().toISOString().split('T')[0];
    expect(data.date).toBe(today);
  });
});
