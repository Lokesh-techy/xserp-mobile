/** @author Lokesh */

const HOUR = 60 * 60_000;
/** The ring is empty once the figures are a day old. */
export const FRESH_SPAN_MS = 24 * HOUR;

export type Freshness = { fill: number; level: 'fresh' | 'aging' | 'stale'; short: string };

/** How full the freshness ring is (1 = just computed), its colour band, and a compact age like `2h`. */
export function freshness(at: Date | null, now = Date.now()): Freshness {
  if (!at) return { fill: 0, level: 'stale', short: '—' };
  const age = Math.max(0, now - at.getTime());
  const fill = Math.max(0, 1 - age / FRESH_SPAN_MS);
  const level = age < HOUR ? 'fresh' : age < FRESH_SPAN_MS ? 'aging' : 'stale';
  const mins = Math.floor(age / 60_000);
  const short = mins < 1 ? 'now' : mins < 60 ? `${mins}m` : mins < 48 * 60 ? `${Math.floor(mins / 60)}h` : `${Math.floor(mins / 1440)}d`;
  return { fill, level, short };
}
