export const SPOT_TYPE_CONFIG: Record<string, { emoji: string; label: string; bg: string; hex: string }> = {
  club: { emoji: '🏛️', label: 'Club', bg: 'bg-blue-700', hex: '#1d4ed8' },
  beach: { emoji: '🏖️', label: 'Beach', bg: 'bg-yellow-500', hex: '#eab308' },
  green_volley: { emoji: '🌿', label: 'Green-Volley', bg: 'bg-green-600', hex: '#16a34a' },
  outdoor_hard: { emoji: '☀️', label: 'Dur', bg: 'bg-green-500', hex: '#22c55e' },
  outdoor_grass: { emoji: '🌱', label: 'Herbe', bg: 'bg-green-400', hex: '#4ade80' },
};

export const MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
export const MONTHS_FULL = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export function getTypeLabel(type: string): string {
  const config = SPOT_TYPE_CONFIG[type];
  return config ? `${config.emoji} ${config.label}` : '📍 Terrain';
}

export function calcAverageRating(comments: Array<{ rating?: number | null }>): number {
  const rated = comments.filter(c => c.rating != null && c.rating > 0);
  if (rated.length === 0) return 0;
  return rated.reduce((sum, c) => sum + c.rating!, 0) / rated.length;
}
