/** @author Lokesh */
import type { RowEdge } from '@/ui';

/** A ledger as the list shows it. `balance` is credit-positive (Cr − Dr), null until balances have loaded. */
export type LedgerItem = { id: string; name: string; group: string; partyCode: string | null; balance: number | null };

export type LedgerSort = 'name' | 'balance';

export type LedgerListRow =
  | { kind: 'header'; key: string; group: string; count: number; total: number | null }
  | ({ kind: 'item'; key: string; item: LedgerItem } & RowEdge);

/** `₹1,200.00 Dr` / `₹50.00 Cr`; zero carries no side. */
export function drCr(balance: number): { amount: number; side: 'Dr' | 'Cr' | null } {
  return { amount: Math.abs(balance), side: balance > 0 ? 'Cr' : balance < 0 ? 'Dr' : null };
}

const byName = (a: LedgerItem, b: LedgerItem) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
// Biggest balance either side first; ledgers without one last.
const byBalance = (a: LedgerItem, b: LedgerItem) => Math.abs(b.balance ?? -1) - Math.abs(a.balance ?? -1) || byName(a, b);

/** Account-group sections (A–Z), each a panel of its ledgers, with the group's count and net balance. */
export function groupLedgers(items: LedgerItem[], sort: LedgerSort): LedgerListRow[] {
  const groups = new Map<string, LedgerItem[]>();
  for (const l of items) {
    const g = l.group || 'Ungrouped';
    const list = groups.get(g);
    if (list) list.push(l);
    else groups.set(g, [l]);
  }
  const rows: LedgerListRow[] = [];
  for (const group of [...groups.keys()].sort((a, b) => a.localeCompare(b))) {
    const list = groups.get(group)!.sort(sort === 'balance' ? byBalance : byName);
    const known = list.some((l) => l.balance !== null);
    const total = known ? list.reduce((n, l) => n + (l.balance ?? 0), 0) : null;
    rows.push({ kind: 'header', key: `h:${group}`, group, count: list.length, total });
    list.forEach((item, i) => rows.push({ kind: 'item', key: item.id, item, first: i === 0, last: i === list.length - 1 }));
  }
  return rows;
}

/** Group name → ledger count, for the group filter menu (A–Z). */
export function groupCounts(items: LedgerItem[]): { group: string; count: number }[] {
  const n = new Map<string, number>();
  for (const l of items) n.set(l.group || 'Ungrouped', (n.get(l.group || 'Ungrouped') ?? 0) + 1);
  return [...n.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([group, count]) => ({ group, count }));
}
