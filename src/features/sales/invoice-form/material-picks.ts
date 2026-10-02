/** @author Lokesh */
export type Picks = Record<string, number>;

/** Quantity per picked material; 0 or less removes it. */
export function setPickQty(picks: Picks, id: string, qty: number): Picks {
  const next = { ...picks };
  if (qty > 0) next[id] = qty;
  else delete next[id];
  return next;
}

export const picksSummary = (picks: Picks) => ({ items: Object.keys(picks).length, units: Object.values(picks).reduce((n, q) => n + q, 0) });

export function parseQty(text: string): number | null {
  const n = Number(text.replace(/,/g, '').trim());
  return text.trim() !== '' && Number.isFinite(n) && n > 0 ? n : null;
}
