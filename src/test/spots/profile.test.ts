import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Profile auto-creation logic (mirrors AppShell.ensureProfile)
//
// The real function:
//   const defaultName = u.user_metadata?.full_name || u.email?.split('@')[0] || 'Joueur';
//   if (!data || !data.display_name) → upsert with defaultName
// ---------------------------------------------------------------------------

interface MockUser {
  id: string;
  email?: string | null;
  user_metadata?: { full_name?: string | null };
}

interface ProfileRow {
  display_name: string | null;
}

/** Pure extraction of the default display name logic from AppShell */
function resolveDefaultName(user: MockUser): string {
  return user.user_metadata?.full_name || user.email?.split('@')[0] || 'Joueur';
}

/** Decides whether the profile needs an update (mirrors the !data || !data.display_name check) */
function shouldUpdateProfile(existingProfile: ProfileRow | null): boolean {
  return !existingProfile || !existingProfile.display_name;
}

// ---------------------------------------------------------------------------
// Display name defaults to email prefix (before @)
// ---------------------------------------------------------------------------
describe('Display name defaults to email prefix', () => {
  it('extracts prefix from simple email', () => {
    const user: MockUser = { id: 'u1', email: 'alice@example.com' };
    expect(resolveDefaultName(user)).toBe('alice');
  });

  it('extracts prefix from email with dots', () => {
    const user: MockUser = { id: 'u2', email: 'jean.dupont@gmail.com' };
    expect(resolveDefaultName(user)).toBe('jean.dupont');
  });

  it('extracts prefix from email with plus tag', () => {
    const user: MockUser = { id: 'u3', email: 'user+tag@test.com' };
    expect(resolveDefaultName(user)).toBe('user+tag');
  });
});

// ---------------------------------------------------------------------------
// Display name uses Google full_name when available
// ---------------------------------------------------------------------------
describe('Display name uses Google full_name when available', () => {
  it('prefers full_name over email prefix', () => {
    const user: MockUser = {
      id: 'u4',
      email: 'alice@example.com',
      user_metadata: { full_name: 'Alice Martin' },
    };
    expect(resolveDefaultName(user)).toBe('Alice Martin');
  });

  it('falls back to email prefix when full_name is null', () => {
    const user: MockUser = {
      id: 'u5',
      email: 'alice@example.com',
      user_metadata: { full_name: null },
    };
    expect(resolveDefaultName(user)).toBe('alice');
  });

  it('falls back to email prefix when full_name is empty string', () => {
    const user: MockUser = {
      id: 'u6',
      email: 'alice@example.com',
      user_metadata: { full_name: '' },
    };
    // empty string is falsy so || chain moves to email
    expect(resolveDefaultName(user)).toBe('alice');
  });

  it('falls back to email prefix when user_metadata is undefined', () => {
    const user: MockUser = { id: 'u7', email: 'alice@example.com' };
    expect(resolveDefaultName(user)).toBe('alice');
  });
});

// ---------------------------------------------------------------------------
// Display name fallback to 'Joueur' when no email
// ---------------------------------------------------------------------------
describe("Display name fallback to 'Joueur'", () => {
  it('returns Joueur when email is null and no full_name', () => {
    const user: MockUser = { id: 'u8', email: null };
    expect(resolveDefaultName(user)).toBe('Joueur');
  });

  it('returns Joueur when email is undefined and no full_name', () => {
    const user: MockUser = { id: 'u9' };
    expect(resolveDefaultName(user)).toBe('Joueur');
  });

  it('still prefers full_name even without email', () => {
    const user: MockUser = {
      id: 'u10',
      email: null,
      user_metadata: { full_name: 'Bob' },
    };
    expect(resolveDefaultName(user)).toBe('Bob');
  });
});

// ---------------------------------------------------------------------------
// Empty string display_name treated as missing (triggers update)
// ---------------------------------------------------------------------------
describe('Empty display_name triggers profile update', () => {
  it('null profile triggers update', () => {
    expect(shouldUpdateProfile(null)).toBe(true);
  });

  it('profile with null display_name triggers update', () => {
    expect(shouldUpdateProfile({ display_name: null })).toBe(true);
  });

  it('profile with empty string display_name triggers update', () => {
    expect(shouldUpdateProfile({ display_name: '' })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Existing non-empty display_name is NOT overwritten
// ---------------------------------------------------------------------------
describe('Existing non-empty display_name is not overwritten', () => {
  it('profile with real name does not trigger update', () => {
    expect(shouldUpdateProfile({ display_name: 'Alice' })).toBe(false);
  });

  it('profile with single character name does not trigger update', () => {
    expect(shouldUpdateProfile({ display_name: 'A' })).toBe(false);
  });

  it('profile with whitespace-only name does not trigger update (truthy string)', () => {
    // ' ' is truthy, so shouldUpdateProfile returns false — the real code does NOT trim
    expect(shouldUpdateProfile({ display_name: ' ' })).toBe(false);
  });
});
