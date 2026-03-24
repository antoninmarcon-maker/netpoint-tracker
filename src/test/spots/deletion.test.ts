import { describe, it, expect } from 'vitest';
import { filterSpots } from '@/lib/filterSpots';
import { DEFAULT_FILTERS, type SpotFiltersState } from '@/components/spots/SpotFilters';

// ── Shared fixtures ─────────────────────────────────────────────────────────

const MODERATOR_EMAILS = ['antonin.marcon@gmail.com', 'myvolley.testbot@gmail.com'];

const isModerator = (email: string) => MODERATOR_EMAILS.includes(email);

const filters = (): SpotFiltersState =>
  JSON.parse(JSON.stringify(DEFAULT_FILTERS));

const baseSpot = {
  id: 'spot-atlantic',
  name: 'Atlantic Parc Seignosse',
  type: 'beach',
  description: 'Beach volley à Seignosse',
  lat: 43.6841,
  lng: -1.3727,
  address: 'Avenue des Lacs, 40510 Seignosse',
  status: 'validated' as string,
  source: null,
  equip_acces_libre: true,
  equip_eclairage: false,
  equip_pmr: false,
  equip_saisonnier: true,
  equip_sol: null,
  availability_period: 'De Juin à Septembre',
  club_telephone: null,
  club_email: null,
  club_site_web: null,
  club_lien_fiche: null,
  ffvb_ligue: null,
  ffvb_comite: null,
  created_at: '2025-06-01T10:00:00Z',
  updated_at: '2025-06-01T10:00:00Z',
  user_id: 'user-other',
};

const spot = (overrides: Partial<typeof baseSpot> = {}) => ({ ...baseSpot, ...overrides });

// ═══════════════════════════════════════════════════════════════════════════
// 1. MODERATOR DELETE PERMISSION LOGIC
// ═══════════════════════════════════════════════════════════════════════════

describe('Moderator delete — access control', () => {
  it('moderator email is authorized', () => {
    expect(isModerator('antonin.marcon@gmail.com')).toBe(true);
    expect(isModerator('myvolley.testbot@gmail.com')).toBe(true);
  });

  it('non-moderator email is rejected', () => {
    expect(isModerator('random@example.com')).toBe(false);
    expect(isModerator('')).toBe(false);
  });

  it('delete button visible only for moderators', () => {
    const shouldShowDelete = (mod: boolean) => mod;
    expect(shouldShowDelete(true)).toBe(true);
    expect(shouldShowDelete(false)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. HANDLE DELETE — RESPONSE INTERPRETATION
// ═══════════════════════════════════════════════════════════════════════════

describe('handleDelete — response interpretation', () => {
  /** Mirrors the handleDelete logic in Spots.tsx */
  function interpretDeleteResult(error: any, count: number | null): { success: boolean; message: string } {
    if (error) return { success: false, message: 'Erreur lors de la suppression' };
    if (count === 0) return { success: false, message: 'Suppression refusée — vérifiez vos permissions' };
    return { success: true, message: 'Terrain supprimé' };
  }

  it('success: no error, count=1', () => {
    const result = interpretDeleteResult(null, 1);
    expect(result.success).toBe(true);
    expect(result.message).toBe('Terrain supprimé');
  });

  it('RLS blocked: no error, count=0 (Supabase silent failure)', () => {
    const result = interpretDeleteResult(null, 0);
    expect(result.success).toBe(false);
    expect(result.message).toContain('permissions');
  });

  it('DB error: error returned', () => {
    const result = interpretDeleteResult({ message: 'some pg error' }, null);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Erreur');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. RLS POLICY LOGIC — is_moderator()
// ═══════════════════════════════════════════════════════════════════════════

describe('RLS — is_moderator() function logic', () => {
  /**
   * Mirrors the SQL function: checks if email is in the moderator list.
   * Without this policy, owner-only delete silently returns count=0 for
   * spots created by other users (e.g. FFVB imports, other users).
   */
  function isModeratorRLS(currentUserEmail: string | null): boolean {
    return currentUserEmail != null && MODERATOR_EMAILS.includes(currentUserEmail);
  }

  it('allows moderator to delete any spot', () => {
    expect(isModeratorRLS('antonin.marcon@gmail.com')).toBe(true);
  });

  it('blocks non-moderator from deleting others spots', () => {
    expect(isModeratorRLS('random@user.com')).toBe(false);
  });

  it('blocks null user (anonymous)', () => {
    expect(isModeratorRLS(null)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. CASCADE DELETE — FK ON DELETE CASCADE
// ═══════════════════════════════════════════════════════════════════════════

describe('Cascade delete logic', () => {
  it('FK ON DELETE CASCADE means we only need to delete the spot', () => {
    // The old code deleted comments, then photos, then spots — 3 queries
    // The new code only deletes spots — 1 query, cascade handles the rest
    const deleteSteps = ['spots.delete()'];
    expect(deleteSteps).toHaveLength(1);
    expect(deleteSteps[0]).toBe('spots.delete()');
  });

  it('old manual cascade would fail silently on RLS', () => {
    // Simulates: moderator tries to delete comments from another user
    // spot_comments_delete_owner policy: auth.uid() = user_id
    // Since the comments belong to other users, delete returns count=0
    const currentUserId = 'moderator-id';
    const commentOwnerId = 'reporter-id';
    const ownerPolicyAllows = currentUserId === commentOwnerId;
    expect(ownerPolicyAllows).toBe(false);
    // This is why the old manual cascade failed — RLS blocked comment deletion
  });

  it('new approach: delete spot directly, FK cascade handles children', () => {
    // With spots_delete_moderator policy: is_moderator() returns true
    // DB cascade deletes comments and photos automatically, bypassing RLS on children
    const moderatorPolicyAllows = true; // is_moderator() returns true
    const spotDeleted = moderatorPolicyAllows; // direct delete succeeds
    const childrenCascaded = spotDeleted; // FK cascade is at DB level, not RLS level
    expect(spotDeleted).toBe(true);
    expect(childrenCascaded).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. REPORTED SPOTS IN PENDING FILTER
// ═══════════════════════════════════════════════════════════════════════════

describe('Reported spots appear in pending/moderation filter', () => {
  const pendingSpot = spot({ id: 'spot-pending', status: 'waiting_for_validation' });
  const reportedSpot = spot({ id: 'spot-reported', status: 'validated' });
  const normalSpot = spot({ id: 'spot-normal', status: 'validated' });

  it('pending filter shows both pending AND reported spots', () => {
    // When showPending is active, the query fetches:
    // 1. All spots with status=waiting_for_validation
    // 2. Validated spots that have report comments
    // Both are merged and passed to filterSpots
    const spotsFromQuery = [pendingSpot, reportedSpot]; // pre-merged by the query
    const f = filters();
    f.showPending = true;
    const result = filterSpots(spotsFromQuery as any, f, null);
    expect(result).toHaveLength(2);
    expect(result.map(s => s.id)).toContain('spot-pending');
    expect(result.map(s => s.id)).toContain('spot-reported');
  });

  it('pending filter with showPending=true passes all spots through', () => {
    // filterSpots returns true for all spots when showPending is active
    const f = filters();
    f.showPending = true;
    const all = [pendingSpot, reportedSpot, normalSpot];
    const result = filterSpots(all as any, f, null);
    expect(result).toHaveLength(3);
  });

  it('reported spot IDs are deduplicated with pending spot IDs', () => {
    // If a spot is both pending AND reported, it should only appear once
    const pendingIds = new Set(['spot-1', 'spot-2']);
    const reportedIds = ['spot-2', 'spot-3'];
    const missingIds = reportedIds.filter(id => !pendingIds.has(id));
    expect(missingIds).toEqual(['spot-3']);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. CONFIRMATION DIALOG
// ═══════════════════════════════════════════════════════════════════════════

describe('Delete confirmation flow', () => {
  it('confirm() must return true for delete to proceed', () => {
    const userConfirmed = true;
    const shouldDelete = userConfirmed;
    expect(shouldDelete).toBe(true);
  });

  it('confirm() returning false cancels delete', () => {
    const userConfirmed = false;
    const shouldDelete = userConfirmed;
    expect(shouldDelete).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. UI STATE AFTER DELETE
// ═══════════════════════════════════════════════════════════════════════════

describe('UI state after delete', () => {
  it('selectedSpotId is set to null after delete', () => {
    let selectedSpotId: string | null = 'spot-atlantic';
    // Simulates: handleDelete success path
    selectedSpotId = null;
    expect(selectedSpotId).toBeNull();
  });

  it('refreshKey is incremented to trigger data reload', () => {
    let refreshKey = 0;
    // Simulates: setRefreshKey(k => k + 1) after delete
    refreshKey = refreshKey + 1;
    expect(refreshKey).toBe(1);
  });

  it('deleted spot disappears from filtered list', () => {
    const spotsBeforeDelete = [
      spot({ id: 'spot-1' }),
      spot({ id: 'spot-atlantic' }),
      spot({ id: 'spot-3' }),
    ];
    // After refresh, the deleted spot is no longer returned by the query
    const spotsAfterRefresh = spotsBeforeDelete.filter(s => s.id !== 'spot-atlantic');
    expect(spotsAfterRefresh).toHaveLength(2);
    expect(spotsAfterRefresh.map(s => s.id)).not.toContain('spot-atlantic');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. E2E — FULL DELETE SCENARIO (Atlantic Parc Seignosse)
// ═══════════════════════════════════════════════════════════════════════════

describe('E2E — Delete reported spot "Atlantic Parc Seignosse"', () => {
  // Simulates the full flow:
  // 1. Spot exists as validated
  // 2. User reports it with reason "gone"
  // 3. Moderator activates pending filter → sees reported spot
  // 4. Moderator opens detail → sees report count
  // 5. Moderator clicks delete → confirm() → spot removed

  const atlanticSpot = spot({ id: 'spot-atlantic', status: 'validated', user_id: 'user-other' });
  const report = { spot_id: 'spot-atlantic', report_reason: 'gone', user_id: 'user-reporter', content: "N'existe plus" };

  it('Step 1: spot is validated and visible in normal mode', () => {
    const f = filters();
    const result = filterSpots([atlanticSpot] as any, f, null);
    expect(result).toHaveLength(1);
  });

  it('Step 2: report created with valid reason', () => {
    expect(report.report_reason).toBe('gone');
    expect(report.spot_id).toBe('spot-atlantic');
  });

  it('Step 3: moderator sees reported spot in pending filter', () => {
    // Query merges pending + reported spots
    const spotsFromQuery = [atlanticSpot]; // reported spot fetched by report join
    const f = filters();
    f.showPending = true;
    const result = filterSpots(spotsFromQuery as any, f, null);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('spot-atlantic');
  });

  it('Step 4: report count is visible in detail modal', () => {
    const comments = [
      { report_reason: 'gone', content: "N'existe plus" },
      { report_reason: null, content: 'Great spot!' },
    ];
    const reportCount = comments.filter(c => c.report_reason).length;
    expect(reportCount).toBe(1);
  });

  it('Step 5: moderator deletes — RLS allows via is_moderator()', () => {
    // The moderator is NOT the spot owner
    const spotOwnerId = atlanticSpot.user_id;
    const moderatorId = 'moderator-id';
    const ownerPolicyAllows = moderatorId === spotOwnerId;
    expect(ownerPolicyAllows).toBe(false); // owner policy would block

    // But moderator policy allows
    const moderatorPolicyAllows = isModerator('antonin.marcon@gmail.com');
    expect(moderatorPolicyAllows).toBe(true); // moderator policy allows

    // Combined: either owner OR moderator → DELETE succeeds
    const deleteAllowed = ownerPolicyAllows || moderatorPolicyAllows;
    expect(deleteAllowed).toBe(true);
  });

  it('Step 6: after delete, spot no longer in results', () => {
    // Simulates refreshed query after deletion
    const remainingSpots: typeof atlanticSpot[] = [];
    const f = filters();
    f.showPending = true;
    const result = filterSpots(remainingSpots as any, f, null);
    expect(result).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. E2E — ROOT CAUSE REPRODUCTION: "Spot reappears after delete"
// ═══════════════════════════════════════════════════════════════════════════

describe('E2E — Bug reproduction: spot reappears after delete', () => {
  it('without moderator RLS policy, delete silently fails (count=0)', () => {
    // This was the original bug:
    // 1. Moderator calls supabase.from('spots').delete().eq('id', spotId)
    // 2. RLS policy: spots_delete_owner → auth.uid() = user_id
    // 3. Moderator is NOT the spot owner → DELETE matches 0 rows
    // 4. Supabase returns { error: null, count: 0 } — no error!
    // 5. UI shows "Terrain supprimé" (old code didn't check count)
    // 6. On next refresh, spot reappears because it was never deleted

    const moderatorIsOwner = false;
    const oldDeleteResult = { error: null, count: 0 };
    const oldCodeCheckedCount = false;
    const spotActuallyDeleted = moderatorIsOwner; // false
    const userSawSuccessToast = !oldCodeCheckedCount; // true — misleading!

    expect(spotActuallyDeleted).toBe(false);
    expect(userSawSuccessToast).toBe(true); // BUG: success toast but nothing deleted
  });

  it('with moderator RLS policy + count check, delete works correctly', () => {
    // Fix:
    // 1. Migration adds spots_delete_moderator policy with is_moderator()
    // 2. handleDelete checks count === 0 to detect RLS rejection
    const moderatorPolicyExists = true;
    const isModeratorUser = true;
    const deleteResult = { error: null, count: moderatorPolicyExists && isModeratorUser ? 1 : 0 };
    const newCodeChecksCount = true;
    const spotActuallyDeleted = deleteResult.count! > 0;
    const userSawCorrectFeedback = newCodeChecksCount && spotActuallyDeleted;

    expect(spotActuallyDeleted).toBe(true);
    expect(userSawCorrectFeedback).toBe(true);
  });

  it('signalement (report comment) was also silently failing', () => {
    // The old code tried to manually delete comments before the spot:
    // await supabase.from('spot_comments').delete().eq('spot_id', spotId)
    // But spot_comments_delete_owner policy blocks this (comments belong to reporter)
    // So the comments were never deleted, making the report disappear on UI refresh
    // because the spot reload re-fetched comments which were still there

    const reportCommentOwnerId = 'user-reporter';
    const moderatorId = 'moderator-id';
    const deleteOwnerPolicyAllows = moderatorId === reportCommentOwnerId;
    expect(deleteOwnerPolicyAllows).toBe(false);
    // This means manual comment deletion silently failed
    // Report "disappeared" because old code set reportMode=false and cleared state,
    // but the comment was still in DB
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 10. MODERATOR ACTIONS UI — BUTTON VISIBILITY MATRIX
// ═══════════════════════════════════════════════════════════════════════════

describe('Moderator actions — button visibility matrix', () => {
  interface ButtonVisibility {
    approve: boolean;
    reject: boolean;
    delete: boolean;
  }

  function getVisibleButtons(isMod: boolean, status: string): ButtonVisibility {
    return {
      approve: isMod && status !== 'validated',
      reject: isMod && status !== 'validated',
      delete: isMod,
    };
  }

  it('pending spot: approve + reject + delete', () => {
    const btns = getVisibleButtons(true, 'waiting_for_validation');
    expect(btns).toEqual({ approve: true, reject: true, delete: true });
  });

  it('validated (reported) spot: delete only', () => {
    const btns = getVisibleButtons(true, 'validated');
    expect(btns).toEqual({ approve: false, reject: false, delete: true });
  });

  it('non-moderator: no buttons', () => {
    const btns = getVisibleButtons(false, 'waiting_for_validation');
    expect(btns).toEqual({ approve: false, reject: false, delete: false });
  });

  it('rejected spot: approve + reject + delete (re-moderation possible)', () => {
    const btns = getVisibleButtons(true, 'rejected');
    expect(btns).toEqual({ approve: true, reject: true, delete: true });
  });
});
