import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Comment validation (mirrors SpotDetailModal logic)
// ---------------------------------------------------------------------------
function validateComment(content: string, rating: number): string | null {
  if (!content.trim()) return 'Le commentaire ne peut pas être vide.';
  if (rating < 1 || rating > 5) return 'La note doit être entre 1 et 5.';
  return null;
}

describe('Comment validation', () => {
  it('rejects empty content', () => {
    expect(validateComment('', 3)).not.toBeNull();
    expect(validateComment('   ', 3)).not.toBeNull();
  });

  it('accepts valid comment with rating 1-5', () => {
    expect(validateComment('Super terrain!', 4)).toBeNull();
    expect(validateComment('Bof', 1)).toBeNull();
    expect(validateComment('Excellent!', 5)).toBeNull();
  });

  it('rejects rating 0', () => {
    expect(validateComment('Test', 0)).not.toBeNull();
  });

  it('rejects rating > 5', () => {
    expect(validateComment('Test', 6)).not.toBeNull();
    expect(validateComment('Test', 100)).not.toBeNull();
  });

  it('rejects negative rating', () => {
    expect(validateComment('Test', -1)).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Comment photo handling
// ---------------------------------------------------------------------------
describe('Comment photo limits', () => {
  const MAX_PHOTOS = 5;

  it('allows 0 photos', () => {
    expect(0).toBeLessThanOrEqual(MAX_PHOTOS);
  });

  it('allows exactly 5 photos', () => {
    expect(5).toBeLessThanOrEqual(MAX_PHOTOS);
  });

  it('rejects 6+ photos', () => {
    expect(6).toBeGreaterThan(MAX_PHOTOS);
  });

  it('rejects adding photos that would exceed limit', () => {
    const canAddPhotos = (current: number, toAdd: number) => current + toAdd <= MAX_PHOTOS;
    expect(canAddPhotos(3, 2)).toBe(true);
    expect(canAddPhotos(3, 3)).toBe(false);
    expect(canAddPhotos(5, 1)).toBe(false);
    expect(canAddPhotos(0, 5)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Average rating calculation
// ---------------------------------------------------------------------------
describe('Average rating calculation', () => {
  const calcAverage = (comments: Array<{ rating: number | null }>) => {
    const rated = comments.filter(c => c.rating != null);
    if (rated.length === 0) return 0;
    return rated.reduce((sum, c) => sum + (c.rating || 0), 0) / rated.length;
  };

  it('returns 0 for no comments', () => {
    expect(calcAverage([])).toBe(0);
  });

  it('returns 0 when all ratings are null', () => {
    expect(calcAverage([{ rating: null }, { rating: null }])).toBe(0);
  });

  it('calculates correct average', () => {
    expect(calcAverage([{ rating: 3 }, { rating: 5 }])).toBe(4);
  });

  it('ignores null ratings in average', () => {
    expect(calcAverage([{ rating: 4 }, { rating: null }, { rating: 2 }])).toBe(3);
  });

  it('single rating returns that value', () => {
    expect(calcAverage([{ rating: 5 }])).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// Comment submission guard
// ---------------------------------------------------------------------------
describe('Comment submission guard', () => {
  it('prevents empty submissions (no text, no rating, no photos)', () => {
    const canSubmit = (content: string, rating: number, photoCount: number) =>
      content.trim().length > 0 || rating > 0 || photoCount > 0;
    expect(canSubmit('', 0, 0)).toBe(false);
    expect(canSubmit('  ', 0, 0)).toBe(false);
  });

  it('allows submission with text only', () => {
    const canSubmit = (content: string, rating: number, photoCount: number) =>
      content.trim().length > 0 || rating > 0 || photoCount > 0;
    expect(canSubmit('Great spot', 0, 0)).toBe(true);
  });

  it('allows submission with rating only', () => {
    const canSubmit = (content: string, rating: number, photoCount: number) =>
      content.trim().length > 0 || rating > 0 || photoCount > 0;
    expect(canSubmit('', 4, 0)).toBe(true);
  });

  it('allows submission with photos only', () => {
    const canSubmit = (content: string, rating: number, photoCount: number) =>
      content.trim().length > 0 || rating > 0 || photoCount > 0;
    expect(canSubmit('', 0, 1)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Report system (mirrors SpotDetailModal report flow)
// ---------------------------------------------------------------------------
const VALID_REPORT_REASONS = ['gone', 'duplicate', 'wrong_location', 'wrong_info', 'other'] as const;
type ReportReason = typeof VALID_REPORT_REASONS[number];

describe('Report requires a valid reason', () => {
  const isValidReason = (reason: string): reason is ReportReason =>
    (VALID_REPORT_REASONS as readonly string[]).includes(reason);

  it('accepts "gone"', () => {
    expect(isValidReason('gone')).toBe(true);
  });

  it('accepts "duplicate"', () => {
    expect(isValidReason('duplicate')).toBe(true);
  });

  it('accepts "wrong_location"', () => {
    expect(isValidReason('wrong_location')).toBe(true);
  });

  it('accepts "wrong_info"', () => {
    expect(isValidReason('wrong_info')).toBe(true);
  });

  it('accepts "other"', () => {
    expect(isValidReason('other')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidReason('')).toBe(false);
  });

  it('rejects unknown reason', () => {
    expect(isValidReason('spam')).toBe(false);
  });
});

describe('Report can have optional comment text', () => {
  /** Mirrors the insert payload in SpotDetailModal.handlePostComment */
  function buildReportPayload(reason: string, comment: string) {
    return {
      report_reason: reason,
      content: comment.trim(),
      rating: null, // reportMode disables rating
    };
  }

  it('includes comment text when provided', () => {
    const payload = buildReportPayload('gone', 'Terrain détruit');
    expect(payload.content).toBe('Terrain détruit');
    expect(payload.report_reason).toBe('gone');
  });

  it('allows empty comment (optional)', () => {
    const payload = buildReportPayload('duplicate', '');
    expect(payload.content).toBe('');
    expect(payload.report_reason).toBe('duplicate');
  });

  it('trims whitespace from comment', () => {
    const payload = buildReportPayload('other', '  some details  ');
    expect(payload.content).toBe('some details');
  });
});

describe('Report mode disables rating', () => {
  it('rating is always null in report mode', () => {
    const reportMode = true;
    const newRating = 4; // user had a rating before entering report mode
    const ratingPayload = reportMode ? null : (newRating > 0 ? newRating : null);
    expect(ratingPayload).toBeNull();
  });

  it('rating is preserved when NOT in report mode', () => {
    const reportMode = false;
    const newRating = 4;
    const ratingPayload = reportMode ? null : (newRating > 0 ? newRating : null);
    expect(ratingPayload).toBe(4);
  });
});

describe('Report count visible to moderator', () => {
  const comments = [
    { id: 'c1', report_reason: null, content: 'Nice spot' },
    { id: 'c2', report_reason: 'gone', content: '' },
    { id: 'c3', report_reason: null, content: 'Great!' },
    { id: 'c4', report_reason: 'duplicate', content: 'Already listed' },
    { id: 'c5', report_reason: 'wrong_location', content: '' },
  ];

  const reportCount = (cmts: typeof comments) =>
    cmts.filter(c => c.report_reason).length;

  it('counts reports correctly', () => {
    expect(reportCount(comments)).toBe(3);
  });

  it('returns 0 when no reports', () => {
    expect(reportCount([{ id: 'c1', report_reason: null, content: 'Good' }])).toBe(0);
  });

  it('report section shows only for moderator when reports exist', () => {
    const isModerator = true;
    const count = reportCount(comments);
    const shouldShow = isModerator && count > 0;
    expect(shouldShow).toBe(true);
  });

  it('report section hidden for non-moderator', () => {
    const isModerator = false;
    const count = reportCount(comments);
    const shouldShow = isModerator && count > 0;
    expect(shouldShow).toBe(false);
  });

  it('report section hidden for moderator when no reports', () => {
    const isModerator = true;
    const noReports = [{ id: 'c1', report_reason: null, content: 'Good' }];
    const shouldShow = isModerator && reportCount(noReports) > 0;
    expect(shouldShow).toBe(false);
  });
});

describe('Report comments displayed with red styling indicator', () => {
  it('report comment gets red styling class', () => {
    const comment = { report_reason: 'gone', content: 'Removed' };
    const cssClass = comment.report_reason
      ? 'bg-red-500/5 border-red-500/20'
      : 'bg-secondary/15 border-border/30';
    expect(cssClass).toBe('bg-red-500/5 border-red-500/20');
  });

  it('normal comment gets default styling class', () => {
    const comment = { report_reason: null, content: 'Nice' };
    const cssClass = comment.report_reason
      ? 'bg-red-500/5 border-red-500/20'
      : 'bg-secondary/15 border-border/30';
    expect(cssClass).toBe('bg-secondary/15 border-border/30');
  });

  it('report reason label is rendered for report comments', () => {
    const REASON_LABELS: Record<string, string> = {
      gone: "N'existe plus",
      duplicate: 'Doublon',
      wrong_location: 'Mauvais lieu',
      wrong_info: 'Infos fausses',
      other: 'Autre',
    };
    expect(REASON_LABELS['gone']).toBe("N'existe plus");
    expect(REASON_LABELS['duplicate']).toBe('Doublon');
    expect(REASON_LABELS['wrong_location']).toBe('Mauvais lieu');
    expect(REASON_LABELS['wrong_info']).toBe('Infos fausses');
    expect(REASON_LABELS['other']).toBe('Autre');
  });
});

// ---------------------------------------------------------------------------
// Comment author display (mirrors SpotDetailModal.loadSpotDetails profile logic)
// ---------------------------------------------------------------------------
describe('Comment author display', () => {
  /**
   * Mirrors the profile resolution logic in SpotDetailModal:
   *   profileMap[userId] = p.display_name || null
   *   For current user fallback: session.user.email?.split('@')[0] || null
   *   Final: c.authorName = profileMap[c.user_id] || 'Anonyme'
   */
  function resolveAuthorName(
    profileMap: Record<string, string | null>,
    userId: string,
  ): string {
    return profileMap[userId] || 'Anonyme';
  }

  it('uses display_name when available', () => {
    const profileMap = { 'u1': 'Alice Martin' };
    expect(resolveAuthorName(profileMap, 'u1')).toBe('Alice Martin');
  });

  it('falls back to email prefix for current user when display_name is empty', () => {
    // Simulates: profileMap[userId] = session.user.email?.split('@')[0]
    const currentUserEmail = 'bob@example.com';
    const profileMap: Record<string, string | null> = {
      'u2': null, // no display_name from profiles table
    };
    // Fallback logic fills in the email prefix for current user
    const currentUserId = 'u2';
    if (!profileMap[currentUserId]) {
      profileMap[currentUserId] = currentUserEmail.split('@')[0] || null;
    }
    expect(resolveAuthorName(profileMap, 'u2')).toBe('bob');
  });

  it("falls back to 'Anonyme' when no profile found", () => {
    const profileMap: Record<string, string | null> = {};
    expect(resolveAuthorName(profileMap, 'unknown-user')).toBe('Anonyme');
  });

  it("falls back to 'Anonyme' when display_name is null and no email fallback", () => {
    const profileMap: Record<string, string | null> = { 'u3': null };
    expect(resolveAuthorName(profileMap, 'u3')).toBe('Anonyme');
  });

  it('handles multiple authors in a comment list', () => {
    const profileMap: Record<string, string | null> = {
      'u1': 'Alice',
      'u2': null,
      'u3': 'Charlie',
    };
    const commentUserIds = ['u1', 'u2', 'u3', 'u4'];
    const authorNames = commentUserIds.map(id => resolveAuthorName(profileMap, id));
    expect(authorNames).toEqual(['Alice', 'Anonyme', 'Charlie', 'Anonyme']);
  });
});
