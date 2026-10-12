/** @author Lokesh */
import type { MaterialName } from '@/features/master-data';

export type StockFilter = 'all' | 'stocked' | 'nonstock' | 'faulty';

const TESTS: Record<StockFilter, (m: MaterialName) => boolean> = {
  all: () => true,
  stocked: (m) => m.isStocked,
  nonstock: (m) => !m.isStocked,
  faulty: (m) => m.isFaulty,
};

export const STOCK_FILTERS: { key: StockFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'stocked', label: 'Stocked' },
  { key: 'nonstock', label: 'Non-stock' },
  { key: 'faulty', label: 'Faulty' },
];

export function filterMaterials(rows: MaterialName[], filter: StockFilter): MaterialName[] {
  return filter === 'all' ? rows : rows.filter(TESTS[filter]);
}

/** How many materials each filter would show, in one pass. */
export function stockCounts(rows: MaterialName[]): Record<StockFilter, number> {
  const n: Record<StockFilter, number> = { all: rows.length, stocked: 0, nonstock: 0, faulty: 0 };
  for (const m of rows) {
    if (m.isStocked) n.stocked++;
    else n.nonstock++;
    if (m.isFaulty) n.faulty++;
  }
  return n;
}

/** The fields material search matches. */
export const materialSearchFields = (m: MaterialName) => [
  m.name,
  m.drawingNo,
  m.makeName !== '-NA-' ? m.makeName : null,
  m.hsnCode,
  m.unit,
];
