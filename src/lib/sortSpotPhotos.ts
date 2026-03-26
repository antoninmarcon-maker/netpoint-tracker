/**
 * Sort spot photos: hero first, then by category order.
 * Photos with unknown/missing categories sort last.
 */

export interface SpotPhoto {
  photo_url: string;
  author_name?: string | null;
  is_hero?: boolean;
  photo_category?: string | null;
}

const CATEGORY_ORDER = ['terrain', 'action', 'groupe', 'vue_exterieure', 'logo'] as const;

export function sortSpotPhotos<T extends SpotPhoto>(photos: T[]): T[] {
  return [...photos].sort((a, b) => {
    if (a.is_hero && !b.is_hero) return -1;
    if (!a.is_hero && b.is_hero) return 1;

    const aIdx = a.photo_category ? CATEGORY_ORDER.indexOf(a.photo_category as typeof CATEGORY_ORDER[number]) : -1;
    const bIdx = b.photo_category ? CATEGORY_ORDER.indexOf(b.photo_category as typeof CATEGORY_ORDER[number]) : -1;

    // -1 means not found → push to end (use a large number)
    const aOrder = aIdx === -1 ? 99 : aIdx;
    const bOrder = bIdx === -1 ? 99 : bIdx;

    return aOrder - bOrder;
  });
}
