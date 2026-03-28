/**
 * Shared formatting utilities.
 */

/** Format a timestamp (ms) as a localized date string. */
export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Format elapsed seconds as M:SS (no leading zero on minutes). */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Format elapsed seconds as MM:SS (leading zero on minutes). */
export function formatTimePadded(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
