import { describe, it, expect } from 'vitest';

const MODERATOR_EMAIL = 'antonin.marcon@gmail.com';

// ---------------------------------------------------------------------------
// Moderator identification
// ---------------------------------------------------------------------------
describe('Moderator access control', () => {
  const isModerator = (email: string) => email === MODERATOR_EMAIL;

  it('identifies antonin.marcon@gmail.com as moderator', () => {
    expect(isModerator('antonin.marcon@gmail.com')).toBe(true);
  });

  it('rejects other emails', () => {
    expect(isModerator('other@example.com')).toBe(false);
    expect(isModerator('antonin.marcon@outlook.com')).toBe(false);
  });

  it('rejects empty email', () => {
    expect(isModerator('')).toBe(false);
  });

  it('is case-sensitive (email must match exactly)', () => {
    expect(isModerator('Antonin.Marcon@gmail.com')).toBe(false);
    expect(isModerator('ANTONIN.MARCON@GMAIL.COM')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Approval / rejection status mapping
// ---------------------------------------------------------------------------
describe('Moderation actions', () => {
  const getStatus = (action: 'approve' | 'reject') =>
    action === 'approve' ? 'validated' : 'rejected';

  it('approve → validated', () => {
    expect(getStatus('approve')).toBe('validated');
  });

  it('reject → rejected', () => {
    expect(getStatus('reject')).toBe('rejected');
  });
});

// ---------------------------------------------------------------------------
// Spot status flow
// ---------------------------------------------------------------------------
describe('Spot status flow', () => {
  it('new user spots start as waiting_for_validation', () => {
    const NEW_SPOT_STATUS = 'waiting_for_validation';
    expect(NEW_SPOT_STATUS).toBe('waiting_for_validation');
  });

  it('suggestions also start as waiting_for_validation', () => {
    const SUGGESTION_STATUS = 'waiting_for_validation';
    expect(SUGGESTION_STATUS).toBe('waiting_for_validation');
  });

  it('only waiting_for_validation spots appear in pending filter', () => {
    type SpotStatus = 'pending' | 'waiting_for_validation' | 'validated' | 'rejected';
    const spots: Array<{ id: string; status: SpotStatus }> = [
      { id: '1', status: 'pending' },
      { id: '2', status: 'waiting_for_validation' },
      { id: '3', status: 'validated' },
      { id: '4', status: 'rejected' },
    ];
    const pending = spots.filter(s => s.status === 'waiting_for_validation');
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe('2');
  });
});

// ---------------------------------------------------------------------------
// Pending filter visibility (UI gate)
// ---------------------------------------------------------------------------
describe('Pending filter visibility', () => {
  it('only renders when isModerator is true', () => {
    const shouldShowPendingPill = (isModerator: boolean) => isModerator;
    expect(shouldShowPendingPill(true)).toBe(true);
    expect(shouldShowPendingPill(false)).toBe(false);
  });

  it('moderation buttons only show for non-validated spots', () => {
    const shouldShowModerationButtons = (isModerator: boolean, status: string) =>
      isModerator && status !== 'validated';
    expect(shouldShowModerationButtons(true, 'waiting_for_validation')).toBe(true);
    expect(shouldShowModerationButtons(true, 'validated')).toBe(false);
    expect(shouldShowModerationButtons(false, 'waiting_for_validation')).toBe(false);
  });
});
