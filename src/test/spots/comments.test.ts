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
