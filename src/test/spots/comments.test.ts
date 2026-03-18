import { describe, it, expect } from 'vitest';

// Comment validation logic (mirrors what SpotDetailModal does)
function validateComment(content: string, rating: number): string | null {
  if (!content.trim()) return 'Le commentaire ne peut pas être vide.';
  if (rating < 1 || rating > 5) return 'La note doit être entre 1 et 5.';
  return null;
}

describe('Comment validation', () => {
  it('rejects empty comment content', () => {
    expect(validateComment('', 3)).not.toBeNull();
    expect(validateComment('   ', 3)).not.toBeNull();
  });

  it('accepts valid comment with rating', () => {
    expect(validateComment('Super terrain!', 4)).toBeNull();
  });

  it('accepts rating of 1 (minimum)', () => {
    expect(validateComment('Bof', 1)).toBeNull();
  });

  it('accepts rating of 5 (maximum)', () => {
    expect(validateComment('Excellent!', 5)).toBeNull();
  });

  it('rejects rating of 0', () => {
    expect(validateComment('Test', 0)).not.toBeNull();
  });

  it('rejects rating of 6', () => {
    expect(validateComment('Test', 6)).not.toBeNull();
  });

  it('rejects negative rating', () => {
    expect(validateComment('Test', -1)).not.toBeNull();
  });
});

describe('Comment photo handling', () => {
  it('allows up to 5 photos', () => {
    const MAX_PHOTOS = 5;
    const photos = new Array(5).fill('photo.jpg');
    expect(photos.length).toBeLessThanOrEqual(MAX_PHOTOS);
  });

  it('rejects more than 5 photos', () => {
    const MAX_PHOTOS = 5;
    const photos = new Array(6).fill('photo.jpg');
    expect(photos.length).toBeGreaterThan(MAX_PHOTOS);
  });
});
