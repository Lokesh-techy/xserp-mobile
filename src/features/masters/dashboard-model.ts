/** @author Lokesh */
import type { z } from 'zod';

import type { mastersDashboardSchema } from './schemas';

type Dashboard = z.infer<typeof mastersDashboardSchema>;

/** The card's switch. */
export type MastersKind = 'parties' | 'materials';

/** One row of a breakdown: how many, and its share of the whole. */
export type Share = { key: string; label: string; count: number; pct: number };

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const shares = (rows: { key: string; label: string; count: number }[], whole: number): Share[] =>
  rows.map((r) => ({ ...r, pct: pct(r.count, whole) }));

/** How many categories get their own row; the rest fold into "Others". */
export const CATEGORY_ROWS = 5;

/** What the Masters header card shows for each side of the switch, worked out once from the payload. */
export function mastersSummary(d: Dashboard) {
  const p = d.parties;
  const m = d.materials;
  const top = d.categories.slice(0, CATEGORY_ROWS);
  const rest = d.categories.slice(CATEGORY_ROWS).reduce((n, c) => n + c.count, 0);
  return {
    parties: {
      total: p.total,
      active: p.active,
      inactive: p.inactive,
      activePct: p.total ? pct(p.active, p.total) : null,
      roles: shares(
        [
          { key: 'customers', label: 'Customers', count: p.customers },
          { key: 'suppliers', label: 'Suppliers', count: p.suppliers },
          { key: 'both', label: 'Both', count: p.both },
          ...(p.other ? [{ key: 'other', label: 'Neither', count: p.other }] : []),
        ],
        p.total,
      ),
    },
    materials: {
      inUse: m.in_use,
      notInUse: m.not_in_use,
      added: m.added_this_month,
      noPrice: m.no_price,
      // Share of in-use materials that have a price set: the gap worth chasing.
      pricedPct: m.in_use ? pct(m.in_use - m.no_price, m.in_use) : null,
      kinds: shares(
        [
          { key: 'stocked', label: 'Stocked', count: m.stocked },
          { key: 'nonstock', label: 'Non-stock', count: m.non_stock },
          { key: 'services', label: 'Services', count: m.services },
        ],
        m.in_use,
      ),
    },
    categories: shares(
      [...top.map((c) => ({ key: c.name, label: c.name, count: c.count })), ...(rest ? [{ key: '__others', label: 'Others', count: rest }] : [])],
      m.in_use,
    ),
  };
}

export type MastersSummary = ReturnType<typeof mastersSummary>;
