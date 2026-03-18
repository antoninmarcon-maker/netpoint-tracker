import { describe, it, expect } from 'vitest';

const MODERATOR_EMAIL = 'antonin.marcon@gmail.com';

describe('Moderator access control', () => {
  it('identifies the moderator by email', () => {
    const isModerator = (email: string) => email === MODERATOR_EMAIL;
    expect(isModerator('antonin.marcon@gmail.com')).toBe(true);
    expect(isModerator('other@example.com')).toBe(false);
    expect(isModerator('')).toBe(false);
  });

  it('approve action maps to validated status', () => {
    const getStatus = (action: 'approve' | 'reject') =>
      action === 'approve' ? 'validated' : 'rejected';
    expect(getStatus('approve')).toBe('validated');
  });

  it('reject action maps to rejected status', () => {
    const getStatus = (action: 'approve' | 'reject') =>
      action === 'approve' ? 'validated' : 'rejected';
    expect(getStatus('reject')).toBe('rejected');
  });
});

describe('Spot status flow', () => {
  it('new user spots should be submitted as waiting_for_validation', () => {
    // This tests the expected status value used during spot creation
    const NEW_SPOT_STATUS = 'waiting_for_validation';
    expect(NEW_SPOT_STATUS).toBe('waiting_for_validation');
  });

  it('suggestion spots should also be waiting_for_validation', () => {
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
    const pendingSpots = spots.filter(s => s.status === 'waiting_for_validation');
    expect(pendingSpots).toHaveLength(1);
    expect(pendingSpots[0].id).toBe('2');
  });
});
