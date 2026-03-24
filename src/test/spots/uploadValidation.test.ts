import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// We test the validation logic from uploadSpotPhoto without calling Supabase.
// The constants and logic are extracted/mirrored from src/lib/uploadSpotPhoto.ts.
// ---------------------------------------------------------------------------

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_PHOTOS = 5;

function isAllowedType(mime: string): boolean {
  return ALLOWED_TYPES.includes(mime);
}

function isWithinSizeLimit(size: number): boolean {
  return size <= MAX_SIZE;
}

function extractExtension(fileName: string, mimeType: string): string {
  return fileName.includes('.') ? fileName.split('.').pop()! : mimeType.split('/')[1];
}

function buildPath(spotId: string, uuid: string, ext: string): string {
  return `${spotId}/${uuid}.${ext}`;
}

// ---------------------------------------------------------------------------
// Allowed MIME types
// ---------------------------------------------------------------------------
describe('Upload validation — allowed MIME types', () => {
  it('accepts image/jpeg', () => {
    expect(isAllowedType('image/jpeg')).toBe(true);
  });

  it('accepts image/png', () => {
    expect(isAllowedType('image/png')).toBe(true);
  });

  it('accepts image/webp', () => {
    expect(isAllowedType('image/webp')).toBe(true);
  });

  it('accepts image/gif', () => {
    expect(isAllowedType('image/gif')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Rejected MIME types
// ---------------------------------------------------------------------------
describe('Upload validation — rejected MIME types', () => {
  it('rejects video/mp4', () => {
    expect(isAllowedType('video/mp4')).toBe(false);
  });

  it('rejects application/pdf', () => {
    expect(isAllowedType('application/pdf')).toBe(false);
  });

  it('rejects text/plain', () => {
    expect(isAllowedType('text/plain')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// File size limit
// ---------------------------------------------------------------------------
describe('Upload validation — file size', () => {
  it('accepts a file exactly at the 5 MB limit', () => {
    expect(isWithinSizeLimit(MAX_SIZE)).toBe(true);
  });

  it('accepts a small file (1 byte)', () => {
    expect(isWithinSizeLimit(1)).toBe(true);
  });

  it('rejects a file 1 byte over the limit', () => {
    expect(isWithinSizeLimit(MAX_SIZE + 1)).toBe(false);
  });

  it('accepts a 0-byte file (edge case)', () => {
    expect(isWithinSizeLimit(0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Extension extraction from file name / MIME type
// ---------------------------------------------------------------------------
describe('Upload validation — extension extraction', () => {
  it('extracts extension from file name when present', () => {
    expect(extractExtension('photo.jpg', 'image/jpeg')).toBe('jpg');
  });

  it('falls back to MIME sub-type when file name has no extension', () => {
    expect(extractExtension('photo', 'image/png')).toBe('png');
  });

  it('handles webp MIME fallback', () => {
    expect(extractExtension('noext', 'image/webp')).toBe('webp');
  });
});

// ---------------------------------------------------------------------------
// File path format
// ---------------------------------------------------------------------------
describe('Upload validation — file path format', () => {
  it('builds path as {spotId}/{uuid}.{ext}', () => {
    const path = buildPath('spot-123', 'aaaa-bbbb', 'jpg');
    expect(path).toBe('spot-123/aaaa-bbbb.jpg');
  });

  it('works with png extension', () => {
    const path = buildPath('s1', 'uuid-1', 'png');
    expect(path).toBe('s1/uuid-1.png');
  });
});

// ---------------------------------------------------------------------------
// Photo count validation
// ---------------------------------------------------------------------------
describe('Upload validation — photo count', () => {
  it('allows up to 5 photos', () => {
    const files = Array.from({ length: MAX_PHOTOS }, () => 'file');
    expect(files.length <= MAX_PHOTOS).toBe(true);
  });

  it('rejects more than 5 photos', () => {
    const files = Array.from({ length: 6 }, () => 'file');
    expect(files.length <= MAX_PHOTOS).toBe(false);
  });

  it('handles empty file list', () => {
    const files: string[] = [];
    expect(files.length).toBe(0);
    expect(files.length <= MAX_PHOTOS).toBe(true);
  });
});
