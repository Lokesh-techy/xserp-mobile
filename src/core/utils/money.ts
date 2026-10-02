/** @author Lokesh */
const grouped = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const plain = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

export function formatMoney(v: number, symbol = '₹'): string {
  const s = `${symbol}${grouped.format(Math.abs(v))}`;
  return v < 0 ? `-${s}` : s;
}

const trim = (n: number) => String(Math.round(n * 10) / 10);

/** ₹2.5 Cr / ₹3.5 L / ₹12.5 K — for dashboard tiles. */
export function formatCompact(v: number, symbol = '₹'): string {
  const a = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (a >= 1e7) return `${sign}${symbol}${trim(a / 1e7)} Cr`;
  if (a >= 1e5) return `${sign}${symbol}${trim(a / 1e5)} L`;
  if (a >= 1e3) return `${sign}${symbol}${trim(a / 1e3)} K`;
  return `${sign}${symbol}${plain.format(a)}`;
}

export function formatQty(v: number, unit?: string | null): string {
  const n = plain.format(v);
  return unit ? `${n} ${unit}` : n;
}
