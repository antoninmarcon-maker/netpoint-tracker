import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Instagram URL normalization (mirrors SpotDetailModal rendering logic)
// ---------------------------------------------------------------------------
function normalizeInstagramUrl(raw: string): string {
  if (raw.startsWith('http')) return raw;
  return `https://instagram.com/${raw.replace('@', '')}`;
}

describe('Instagram URL normalization', () => {
  it('keeps a full https URL unchanged', () => {
    expect(normalizeInstagramUrl('https://instagram.com/monterrain')).toBe('https://instagram.com/monterrain');
  });

  it('keeps a full http URL unchanged', () => {
    expect(normalizeInstagramUrl('http://instagram.com/monterrain')).toBe('http://instagram.com/monterrain');
  });

  it('converts @username to full URL', () => {
    expect(normalizeInstagramUrl('@monterrain')).toBe('https://instagram.com/monterrain');
  });

  it('converts plain username to full URL', () => {
    expect(normalizeInstagramUrl('monterrain')).toBe('https://instagram.com/monterrain');
  });

  it('handles URL with www prefix', () => {
    expect(normalizeInstagramUrl('https://www.instagram.com/monterrain')).toBe('https://www.instagram.com/monterrain');
  });
});

// ---------------------------------------------------------------------------
// Facebook URL normalization (mirrors SpotDetailModal rendering logic)
// ---------------------------------------------------------------------------
function normalizeFacebookUrl(raw: string): string {
  if (raw.startsWith('http')) return raw;
  return `https://facebook.com/${raw}`;
}

describe('Facebook URL normalization', () => {
  it('keeps a full https URL unchanged', () => {
    expect(normalizeFacebookUrl('https://facebook.com/mypage')).toBe('https://facebook.com/mypage');
  });

  it('converts a page name to full URL', () => {
    expect(normalizeFacebookUrl('mypage')).toBe('https://facebook.com/mypage');
  });

  it('handles URL with www prefix', () => {
    expect(normalizeFacebookUrl('https://www.facebook.com/mypage')).toBe('https://www.facebook.com/mypage');
  });

  it('handles long-form Facebook URL with path', () => {
    expect(normalizeFacebookUrl('https://facebook.com/groups/123456')).toBe('https://facebook.com/groups/123456');
  });
});

// ---------------------------------------------------------------------------
// WhatsApp URL normalization (mirrors SpotDetailModal rendering logic)
// ---------------------------------------------------------------------------
function normalizeWhatsappUrl(raw: string): string {
  if (raw.startsWith('http')) return raw;
  return `https://wa.me/${raw.replace(/\D/g, '')}`;
}

describe('WhatsApp URL normalization', () => {
  it('keeps a full group link unchanged', () => {
    expect(normalizeWhatsappUrl('https://chat.whatsapp.com/abc123')).toBe('https://chat.whatsapp.com/abc123');
  });

  it('converts a phone number to wa.me link', () => {
    expect(normalizeWhatsappUrl('+33612345678')).toBe('https://wa.me/33612345678');
  });

  it('strips non-digit characters from phone number', () => {
    expect(normalizeWhatsappUrl('+33 6 12 34 56 78')).toBe('https://wa.me/33612345678');
  });

  it('handles plain digits', () => {
    expect(normalizeWhatsappUrl('33612345678')).toBe('https://wa.me/33612345678');
  });

  it('keeps wa.me link unchanged', () => {
    expect(normalizeWhatsappUrl('https://wa.me/33612345678')).toBe('https://wa.me/33612345678');
  });
});

// ---------------------------------------------------------------------------
// Social fields are optional — empty strings become null in insert payload
// (mirrors SpotFormModal: socialInstagram || null)
// ---------------------------------------------------------------------------
describe('Social fields optional (null when empty)', () => {
  const toNullable = (val: string) => val || null;

  it('empty string becomes null', () => {
    expect(toNullable('')).toBeNull();
  });

  it('non-empty string is preserved', () => {
    expect(toNullable('@monterrain')).toBe('@monterrain');
  });

  it('whitespace-only string is preserved (truthy)', () => {
    // Note: ' ' is truthy so it stays — this matches the actual behavior
    expect(toNullable(' ')).toBe(' ');
  });
});

// ---------------------------------------------------------------------------
// Social fields preserved in suggestion flow (isSuggestion=true)
// (mirrors SpotFormModal reset logic using spotToEdit values)
// ---------------------------------------------------------------------------
describe('Social fields preserved from spotToEdit in suggestion mode', () => {
  const spotToEdit = {
    social_instagram: '@monterrain',
    social_facebook: 'https://facebook.com/mypage',
    social_whatsapp: '+33612345678',
  };

  // Mirrors: setSocialInstagram(spotToEdit?.social_instagram || '')
  const getFormValue = (field: string | null | undefined) => field || '';

  it('Instagram value loaded from spotToEdit', () => {
    expect(getFormValue(spotToEdit.social_instagram)).toBe('@monterrain');
  });

  it('Facebook value loaded from spotToEdit', () => {
    expect(getFormValue(spotToEdit.social_facebook)).toBe('https://facebook.com/mypage');
  });

  it('WhatsApp value loaded from spotToEdit', () => {
    expect(getFormValue(spotToEdit.social_whatsapp)).toBe('+33612345678');
  });

  it('null social field defaults to empty string', () => {
    expect(getFormValue(null)).toBe('');
  });

  it('undefined social field defaults to empty string', () => {
    expect(getFormValue(undefined)).toBe('');
  });
});
